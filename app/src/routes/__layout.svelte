<script context="module">
  import { Buffer } from 'buffer'; // @ledger assumes this is available but it's only native to Node
  globalThis.Buffer = Buffer;
  if (typeof window !== 'undefined') {
    window.global = globalThis;
  }
</script>

<script lang="ts">
  import '../app.css';
  import { createWalletStore, WalletConnectionState, walletConnectionStateLabels } from '$lib/wallets';
  import { setSolanaContext } from '$lib/context';
  import { Commitment, Connection, Keypair, PublicKey } from '@solana/web3.js';
  import { onMount, setContext } from 'svelte';
  import WalletList from '../lib/WalletList.svelte';
  import WalletGrid from '../lib/WalletGrid.svelte';

  const wallet = createWalletStore({
    autoconnect: true,
  });

  const commitmentLevel: Commitment = 'processed';

  const network = 'https://api.devnet.solana.com';
  const connection = new Connection(network, commitmentLevel);

  setSolanaContext({ wallet, connection, commitmentLevel });

  onMount(async () => {
    const wallets = await import('@solana/wallet-adapter-wallets');
    const walletList = [
      wallets.getPhantomWallet(),
      wallets.getSlopeWallet(),
      wallets.getBitpieWallet(),
      wallets.getSolflareWallet(),
    ];
    $wallet.setWallets(walletList);
  });

  $: console.log('Pubkey:', $wallet.publicKey?.toString());

  let switchWalletMenuOpen = false;
</script>

<div id="main" class="bg-gray-900 text-gray-100 min-h-screen w-full">
  <div class="mx-auto container">
    <header class="py-2 flex flex-row justify-between">
      <span class="text-sm"
        >Wallet State: {walletConnectionStateLabels[$wallet.state]}
        {#if $wallet.publicKey}
          as
          {$wallet.publicKey.toString()}{/if}</span>
      <div class="relative">
        <button
          on:click={() => (switchWalletMenuOpen = !switchWalletMenuOpen)}
          class="text-sm font-medium rounded-lg border border-gray-500 px-3 py-2">Switch Wallets</button>
        {#if switchWalletMenuOpen}
          <div class="absolute right-0">
            <WalletList on:select={() => (switchWalletMenuOpen = false)} />
          </div>
        {/if}
      </div>
    </header>
    <main class="pt-2">
      {#if $wallet.state === WalletConnectionState.connected}
        <slot />
      {:else}
        <WalletGrid />
      {/if}
    </main>
  </div>
</div>
