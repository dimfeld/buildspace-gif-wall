/* This is a reworked version of the official in-development Solana Svelte wallet store
 * at https://github.com/solana-labs/wallet-adapter/tree/master/packages/core/svelte */
import {
  MessageSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
  SendTransactionOptions,
  SignerWalletAdapter,
  SignerWalletAdapterProps,
  WalletAdapter,
  WalletError,
  WalletNotConnectedError,
  WalletNotFoundError,
  WalletNotReadyError,
} from '@solana/wallet-adapter-base';
import type { Wallet, WalletName } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { onDestroy } from 'svelte';
import { Writable, writable } from 'svelte/store';

type Adapter = ReturnType<Wallet['adapter']>;

export interface WalletStoreOptions {
  wallets?: Wallet[];
  localStorageKey?: string;
  autoconnect?: boolean;
  onError?: (e: Error) => unknown;
}

export enum WalletConnectionState {
  notready,
  ready,
  connecting,
  connected,
}

export const walletConnectionStateLabels = {
  [WalletConnectionState.notready]: 'No Wallet Selected',
  [WalletConnectionState.ready]: 'Disconnected',
  [WalletConnectionState.connecting]: 'Connecting',
  [WalletConnectionState.connected]: 'Connected',
};

export interface WalletStore {
  wallet: Wallet | null;
  allWallets: Record<string, Wallet>;
  publicKey: PublicKey | null;
  state: WalletConnectionState;

  select(walletName: WalletName): void;
  setWallets(wallets: Wallet[]): void;

  connect(): Promise<void>;

  disconnect(): Promise<void>;

  sendTransaction(
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature>;

  signTransaction: SignerWalletAdapterProps['signTransaction'] | undefined;
  signAllTransactions: SignerWalletAdapterProps['signAllTransactions'] | undefined;
  signMessage: MessageSignerWalletAdapterProps['signMessage'] | undefined;
}

/** A store that makes it easy to fetch the current value without actually subscribing to it */
function wrappedWritableStore<T>(initial: T): [() => T, Writable<T>] {
  let internal = writable(initial);
  let currentValue = initial;

  return [
    () => currentValue,
    {
      subscribe: internal.subscribe,
      set(value: T) {
        currentValue = value;
        internal.set(value);
      },
      update(updateFn: (value: T) => T) {
        currentValue = updateFn(currentValue);
        internal.set(currentValue);
      },
    },
  ];
}

export function createWalletStore(options: WalletStoreOptions) {
  let wallets: Record<string, Wallet> = {};

  let localStorageKey = options.localStorageKey ?? 'walletAdapter';
  let currentAdapter: Adapter | null = null;

  const onError = options.onError ?? console.error;

  let [currentWallet, walletStore] = wrappedWritableStore<WalletStore>({
    wallet: null,
    allWallets: wallets,
    publicKey: null,
    state: WalletConnectionState.notready,
    select,
    setWallets,
    connect,
    disconnect,
    sendTransaction,
    signTransaction: undefined,
    signAllTransactions: undefined,
    signMessage: undefined,
  });

  function onConnect() {
    setConnectionState(WalletConnectionState.connected, { publicKey: currentAdapter.publicKey });
  }

  function onDisconnect() {
    setConnectionState(WalletConnectionState.ready, { publicKey: null });
  }

  function onReady() {
    setConnectionState(WalletConnectionState.ready);
  }

  function setConnectionState(state: WalletConnectionState, extra?: Partial<WalletStore>) {
    walletStore.update((w) => ({
      ...w,
      state,
      ...(extra ?? {}),
    }));
  }

  async function switchAdapter(wallet: Wallet | null) {
    if (currentAdapter) {
      currentAdapter.off('ready', onReady);
      currentAdapter.off('connect', onConnect);
      currentAdapter.off('disconnect', onDisconnect);
      currentAdapter.off('error', onError);
      await currentAdapter.disconnect();
      currentAdapter = null;
    }

    let signTransaction: SignerWalletAdapter['signTransaction'] | undefined = undefined;
    let signAllTransactions: SignerWalletAdapter['signAllTransactions'] | undefined = undefined;
    let signMessage: MessageSignerWalletAdapter['signMessage'] | undefined = undefined;

    setConnectionState(WalletConnectionState.notready, { publicKey: null });

    if (wallet) {
      currentAdapter = wallet.adapter();
      currentAdapter.on('ready', onReady);
      currentAdapter.on('connect', onConnect);
      currentAdapter.on('disconnect', onDisconnect);
      currentAdapter.on('error', onError);

      // Sign a transaction if the wallet supports it
      if ('signTransaction' in currentAdapter) {
        signTransaction = async function (transaction: Transaction) {
          if (currentWallet().state !== WalletConnectionState.connected) {
            throw new WalletNotConnectedError();
          }
          return currentAdapter.signTransaction(transaction);
        };
      }

      // Sign multiple transactions if the wallet supports it
      if ('signAllTransactions' in currentAdapter) {
        signAllTransactions = async function (transactions: Transaction[]) {
          if (currentWallet().state !== WalletConnectionState.connected) {
            throw new WalletNotConnectedError();
          }
          return currentAdapter.signAllTransactions(transactions);
        };
      }

      // Sign an arbitrary message if the wallet supports it
      if ('signMessage' in currentAdapter) {
        signMessage = async function (message: Uint8Array) {
          if (currentWallet().state !== WalletConnectionState.connected) {
            throw new WalletNotConnectedError();
          }
          return currentAdapter.signMessage(message);
        };
      }

      if (currentAdapter.connected) {
        setConnectionState(WalletConnectionState.ready);
      } else if (currentAdapter.connecting) {
        setConnectionState(WalletConnectionState.connecting);
      } else if (currentAdapter.ready) {
        setConnectionState(WalletConnectionState.ready);
      }
    }

    walletStore.update((w) => ({
      ...w,
      wallet,
      signTransaction,
      signAllTransactions,
      signMessage,
    }));
  }

  async function setWallets(newWallets: Wallet[]) {
    wallets = Object.fromEntries(newWallets.map((wallet) => [wallet.name, wallet]));

    walletStore.update((w) => ({
      ...w,
      allWallets: wallets,
    }));

    let selected = currentWallet().wallet;
    if (selected && !wallets[selected.name]) {
      return select(null);
    } else {
      return maybeLoadLocalStorage();
    }
  }

  let performedLocalStorageLoad = false;
  function maybeLoadLocalStorage() {
    if (
      !performedLocalStorageLoad &&
      typeof window !== 'undefined' &&
      Object.values(wallets).length > 1 &&
      !currentWallet().wallet
    ) {
      performedLocalStorageLoad = true;
      let savedWalletName = window.localStorage.getItem(localStorageKey);
      if (savedWalletName && wallets[savedWalletName]) {
        return select(savedWalletName);
      }
    }
  }

  async function select(walletName: string | null) {
    if (walletName && !wallets[walletName]) {
      throw new WalletNotFoundError(walletName);
    }

    if (typeof window !== 'undefined') {
      window.localStorage[localStorageKey] = walletName || '';
    }

    if (currentWallet().wallet === wallets[walletName]) {
      return;
    }

    await switchAdapter(wallets[walletName] ?? null);
  }

  async function connect() {
    if (!currentAdapter) {
      throw new Error('No wallet selected');
    }

    let wallet = currentWallet();
    if (wallet.state === WalletConnectionState.notready) {
      window.open(wallet.wallet.url, '_blank');
      throw new WalletNotReadyError();
    }

    try {
      setConnectionState(WalletConnectionState.connecting);
      await currentAdapter.connect();
      // Let the callbacks update the state to connected.
    } catch (e) {
      if (currentWallet().state === WalletConnectionState.connecting) {
        setConnectionState(WalletConnectionState.ready);
      }

      throw e;
    }
  }

  async function disconnect() {
    if (!currentAdapter) {
      return;
    }

    return currentAdapter.disconnect();
  }

  async function sendTransaction(
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    let wallet = currentWallet();
    if (wallet.state !== WalletConnectionState.connected) {
      throw new WalletNotConnectedError();
    }

    if (!currentAdapter) {
      throw new Error('No wallet selected');
    }

    let result = await currentAdapter.sendTransaction(transaction, connection, options);

    return result;
  }

  let autoconnectUnsub: () => void | undefined;

  if (options.autoconnect) {
    autoconnectUnsub = walletStore.subscribe((wallet) => {
      if (wallet.state !== WalletConnectionState.ready) {
        return;
      }

      connect();
    });
  }

  onDestroy(() => {
    autoconnectUnsub?.();
    select(null);
  });

  if (options.wallets) {
    setWallets(options.wallets);
  }

  maybeLoadLocalStorage();

  return walletStore;
}
