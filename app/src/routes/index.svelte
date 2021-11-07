<script lang="ts">
  import { Program, Provider, web3 } from '@project-serum/anchor';
  import { WalletConnectionState, walletConnectionStateLabels } from '$lib/wallets';
  import { getSolanaContext } from '$lib/context';
  import idl from '$lib/idl/buildspace_gif_wall.json';
  import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
  import { getContext, onMount } from 'svelte';

  const { wallet, connection, commitmentLevel } = getSolanaContext();
  const baseAccount: PublicKey = getContext('baseAccount');

  const programID = new PublicKey(idl.metadata.address);
  $: provider = new Provider(connection, $wallet, {
    preflightCommitment: commitmentLevel,
  });
  $: program = new Program(idl, programID, provider);
  let listAccount: PublicKey | null = null;

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
      [new TextEncoder().encode('giflist2'), provider.wallet.publicKey.toBytes()],
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

  $: if (program && !listAccount) {
    initAccount().catch(console.error);
  }

  let items = [];

  let textInput = '';
  async function handleAdd(e: Event) {
    e.preventDefault();
    if (!textInput) {
      return;
    }

    await program.rpc.addGif(textInput, {
      accounts: {
        baseAccount: listAccount,
        listOwner: provider.wallet.publicKey,
        user: provider.wallet.publicKey,
      },
    });

    fetchAccountData();

    e.target.focus();
    textInput = '';
  }

  async function upvote(url: string) {
    await program.rpc.upvote(url, {
      accounts: {
        baseAccount: listAccount,
        listOwner: provider.wallet.publicKey,
        user: provider.wallet.publicKey,
      },
    });

    fetchAccountData();
  }

  async function deleteList(account = listAccount) {
    await program.rpc.deleteList({
      accounts: {
        baseAccount: account,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    });
  }

  async function sendTip(pubkey) {
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

  let testGifs = [
    'https://media1.giphy.com/media/EatwJZRUIv41G/giphy.webp?cid=ecf05e475pbx7elu6edgcfpcigb8icske07oqo0189twill5&rid=giphy.webp&ct=g',
    'https://media0.giphy.com/media/TObbUke0z8Mo/200.webp?cid=ecf05e475pbx7elu6edgcfpcigb8icske07oqo0189twill5&rid=200.webp&ct=g',
    'https://media4.giphy.com/media/xNuoUMEJCdVKVm7r2x/200w.webp?cid=ecf05e475pbx7elu6edgcfpcigb8icske07oqo0189twill5&rid=200w.webp&ct=g',
    'https://media4.giphy.com/media/N6funLtVsHW0g/giphy.webp?cid=ecf05e475pbx7elu6edgcfpcigb8icske07oqo0189twill5&rid=giphy.webp&ct=g',
  ];

  // $: items = testGifs.map((url) => ({ url }));
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
