<script lang="ts">
  import * as anchor from '@project-serum/anchor';
  const { Provider, Program, web3 } = anchor;

  import { getSolanaContext } from '$lib/context';
  import idl from '$lib/idl/buildspace_gif_wall.json';
  import { PublicKey, SystemProgram } from '@solana/web3.js';
  import { WalletConnectionState } from '../lib/wallets';
  import { onMount } from 'svelte';

  const { wallet, connection, commitmentLevel } = getSolanaContext();

  const programID = new PublicKey(idl.metadata.address);
  const unconnectedWallet = {
    publicKey: null,
    signTransaction: () => Promise.reject(new Error('Not connected to wallet')),
    signAllTransactions: () => Promise.reject(new Error('Not connected to wallet')),
  };

  $: connectedToWallet = $wallet.state === WalletConnectionState.connected;
  $: providerWallet = connectedToWallet ? $wallet : unconnectedWallet;
  $: provider = new Provider(connection, providerWallet, {
    preflightCommitment: commitmentLevel,
  });
  $: program = new Program(idl, programID, provider);
  let listAccount: PublicKey | null = null;
  const listOwner = new PublicKey('Gcdp6Mw1BfRPWuJFvFmNwjvgkSDyWgot6Yp2hfw81KL5');

  async function createAccount(account, bump) {
    console.log('creating account', account);
    return program.rpc.newList(bump, {
      accounts: {
        baseAccount: account,
        user: provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      },
    });
  }

  async function initAccount() {
    let [account, listAccountBump] = await web3.PublicKey.findProgramAddress(
      [new TextEncoder().encode('giflist2'), listOwner.toBytes()],
      program.programId
    );

    console.log('List account', account.toString());

    try {
      await fetchAccountData(account);
    } catch (e) {
      if (/Account does not exist/.test(e.message)) {
        await createAccount(account, listAccountBump);
      } else {
        throw e;
      }
    }

    listAccount = account;
  }

  async function fetchAccountData(account = listAccount) {
    let listData = await program.account.baseAccount.fetch(account);
    console.log('Got account', account, listData);
    items = listData.gifs;
  }

  let mounted = false;
  onMount(() => (mounted = true));

  $: if (program && !listAccount && mounted) {
    initAccount().catch(console.error);
  }

  let items = [];

  let textInput = '';
  async function handleAdd(e: Event) {
    if (!connectedToWallet) {
      alert('Please connect to your wallet using the "Connect to Wallet" button');
      return;
    }

    e.preventDefault();
    if (!textInput) {
      return;
    }

    await program.rpc.addGif(textInput, {
      accounts: {
        baseAccount: listAccount,
        listOwner,
        user: provider.wallet.publicKey,
      },
    });

    fetchAccountData();

    e.target.focus();
    textInput = '';
  }

  async function upvote(url: string) {
    if (!connectedToWallet) {
      alert('Please connect to your wallet using the "Connect to Wallet" button');
      return;
    }

    await program.rpc.upvote(url, {
      accounts: {
        baseAccount: listAccount,
        listOwner,
        user: provider.wallet.publicKey,
      },
    });

    fetchAccountData();
  }

  async function deleteList(account = listAccount) {
    if (!connectedToWallet) {
      alert('Please connect to your wallet using the "Connect to Wallet" button');
      return;
    }

    await program.rpc.deleteList({
      accounts: {
        baseAccount: account,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    });
  }

  async function sendTip(pubkey) {
    if (!connectedToWallet) {
      alert('Please connect to your wallet using the "Connect to Wallet" button');
      return;
    }

    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: pubkey,
        lamports: web3.LAMPORTS_PER_SOL / 100,
      })
    );

    let tx = await $wallet.sendTransaction(transaction, connection).catch(console.error);
    alert(`Tip tx ${tx}`);
  }
</script>

<div class="mx-auto">
  <h1 class="text-4xl text-center font-bold text-gray-200">🐼 Panda Land 🐼</h1>

  <form action="#" class="mt-2 flex flex-row" on:submit={handleAdd}>
    <input type="text" placeholder="Add an image!" bind:value={textInput} class="px-2 flex-grow" />
    <button class="ml-2 bg-gray-800 border border-gray-500 rounded px-3 py-2" type="submit">Add</button>
  </form>
  <ul id="images" class="flex flex-row flex-wrap mt-2 gap-4">
    {#each items as item}
      <li class="flex flex-col">
        <img src={item.url} alt="Added by {item.adder.toString()}" />
        <div class="flex justify-between">
          <button title="Send a tip to {item.adder.toString()}" on:click={() => sendTip(item.adder)}>🤑</button>
          <span>{item.votes} Votes</span>
          <button on:click={() => upvote(item.url)}>👍</button>
        </div>
      </li>
    {:else}
      <li class="px-3 py-2">Your list is empty, add something!</li>
    {/each}
  </ul>
  <!-- <button on:click={deleteList}>Delete this List</button> -->
</div>

<style lang="postcss">
  input {
    @apply bg-gray-800;
  }

  #images > li {
    max-width: 16rem;
  }
</style>
