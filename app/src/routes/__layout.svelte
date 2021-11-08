<script context="module">
  import { Buffer } from 'buffer'; // @ledger assumes this is available but it's only native to Node
  globalThis.Buffer = Buffer;
  if (typeof window !== 'undefined') {
    window.global = globalThis;
  }
</script>

<script lang="ts">
  import '../app.css';
  import * as web3 from '@solana/web3.js';
  import { createWalletStore, WalletConnectionState, walletConnectionStateLabels } from '$lib/wallets';
  import { setSolanaContext } from '$lib/context';
  import { onMount, setContext } from 'svelte';
  import WalletList from '$lib/WalletList.svelte';
  import WalletGrid from '$lib/WalletGrid.svelte';

  const wallet = createWalletStore({
    autoconnect: true,
  });

  const commitmentLevel: web3.Commitment = 'processed';

  const network = 'https://api.devnet.solana.com';
  const connection = new web3.Connection(network, commitmentLevel);

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

<div id="main" class="bg-gray-900 text-gray-100 w-full">
  <div class="mx-auto h-full container flex flex-col min-h-screen">
    <header class="py-2 flex flex-row justify-between">
      <span class="text-sm"
        >Wallet State: {walletConnectionStateLabels[$wallet.state]}
        {#if $wallet.publicKey}
          as
          {$wallet.publicKey.toString()}{/if}</span>
      <div class="relative">
        <button
          on:click={() => (switchWalletMenuOpen = !switchWalletMenuOpen)}
          class="text-sm font-medium rounded-lg border border-gray-500 px-3 py-2"
          >{#if $wallet.state === WalletConnectionState.connected}Switch Wallets{:else}Connect to Wallet{/if}</button>
        {#if switchWalletMenuOpen}
          <div class="absolute right-0">
            <WalletList on:select={() => (switchWalletMenuOpen = false)} />
          </div>
        {/if}
      </div>
    </header>
    <main class="pt-2">
      <slot />
    </main>
    <footer class="mt-auto py-4 flex justify-between items-end">
      <div class="flex flex-row items-center space-x-2">
        <span>Made with</span>
        <a href="https://kit.svelte.dev" title="SvelteKit">
          <svg xmlns="http://www.w3.org/2000/svg" width="107" height="128" viewBox="0 0 107 128"
            ><title>svelte-logo</title><path
              d="M94.1566,22.8189c-10.4-14.8851-30.94-19.2971-45.7914-9.8348L22.2825,29.6078A29.9234,29.9234,0,0,0,8.7639,49.6506a31.5136,31.5136,0,0,0,3.1076,20.2318A30.0061,30.0061,0,0,0,7.3953,81.0653a31.8886,31.8886,0,0,0,5.4473,24.1157c10.4022,14.8865,30.9423,19.2966,45.7914,9.8348L84.7167,98.3921A29.9177,29.9177,0,0,0,98.2353,78.3493,31.5263,31.5263,0,0,0,95.13,58.117a30,30,0,0,0,4.4743-11.1824,31.88,31.88,0,0,0-5.4473-24.1157"
              style="fill:#ff3e00" /><path
              d="M45.8171,106.5815A20.7182,20.7182,0,0,1,23.58,98.3389a19.1739,19.1739,0,0,1-3.2766-14.5025,18.1886,18.1886,0,0,1,.6233-2.4357l.4912-1.4978,1.3363.9815a33.6443,33.6443,0,0,0,10.203,5.0978l.9694.2941-.0893.9675a5.8474,5.8474,0,0,0,1.052,3.8781,6.2389,6.2389,0,0,0,6.6952,2.485,5.7449,5.7449,0,0,0,1.6021-.7041L69.27,76.281a5.4306,5.4306,0,0,0,2.4506-3.631,5.7948,5.7948,0,0,0-.9875-4.3712,6.2436,6.2436,0,0,0-6.6978-2.4864,5.7427,5.7427,0,0,0-1.6.7036l-9.9532,6.3449a19.0329,19.0329,0,0,1-5.2965,2.3259,20.7181,20.7181,0,0,1-22.2368-8.2427,19.1725,19.1725,0,0,1-3.2766-14.5024,17.9885,17.9885,0,0,1,8.13-12.0513L55.8833,23.7472a19.0038,19.0038,0,0,1,5.3-2.3287A20.7182,20.7182,0,0,1,83.42,29.6611a19.1739,19.1739,0,0,1,3.2766,14.5025,18.4,18.4,0,0,1-.6233,2.4357l-.4912,1.4978-1.3356-.98a33.6175,33.6175,0,0,0-10.2037-5.1l-.9694-.2942.0893-.9675a5.8588,5.8588,0,0,0-1.052-3.878,6.2389,6.2389,0,0,0-6.6952-2.485,5.7449,5.7449,0,0,0-1.6021.7041L37.73,51.719a5.4218,5.4218,0,0,0-2.4487,3.63,5.7862,5.7862,0,0,0,.9856,4.3717,6.2437,6.2437,0,0,0,6.6978,2.4864,5.7652,5.7652,0,0,0,1.602-.7041l9.9519-6.3425a18.978,18.978,0,0,1,5.2959-2.3278,20.7181,20.7181,0,0,1,22.2368,8.2427,19.1725,19.1725,0,0,1,3.2766,14.5024,17.9977,17.9977,0,0,1-8.13,12.0532L51.1167,104.2528a19.0038,19.0038,0,0,1-5.3,2.3287"
              style="fill:#fff" /></svg>
        </a>

        <a href="https://tailwindcss.com" title="TailwindCSS">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 54 33"
            ><g clip-path="url(#prefix__clip0)"
              ><path
                fill="#06B6D4"
                fill-rule="evenodd"
                d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z"
                clip-rule="evenodd" /></g
            ><defs><clipPath id="prefix__clip0"><path fill="#fff" d="M0 0h54v32.4H0z" /></clipPath></defs></svg>
        </a>

        <a href="https://solana.com" title="Solana">
          <svg width="96" height="84" viewBox="0 0 96 84" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0)">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.368 64.052C17.669 63.7209 18.0359 63.4563 18.445 63.2752C18.8541 63.094 19.2966 63.0003 19.744 63L93.056 63.06C93.3682 63.0606 93.6735 63.1519 93.9349 63.3228C94.1962 63.4936 94.4023 63.7367 94.5281 64.0224C94.6539 64.3081 94.694 64.6242 94.6436 64.9323C94.5932 65.2404 94.4544 65.5273 94.244 65.758L78.632 82.948C78.3308 83.2793 77.9637 83.5441 77.5542 83.7252C77.1447 83.9064 76.7018 84 76.254 84L2.94405 83.94C2.63185 83.9394 2.32654 83.8481 2.06523 83.6772C1.80391 83.5064 1.59783 83.2634 1.47202 82.9776C1.3462 82.6919 1.30607 82.3758 1.35649 82.0677C1.40691 81.7596 1.54572 81.4727 1.75605 81.242L17.368 64.052ZM94.244 49.742C94.4544 49.9727 94.5932 50.2596 94.6436 50.5677C94.694 50.8758 94.6539 51.1919 94.5281 51.4776C94.4023 51.7634 94.1962 52.0064 93.9349 52.1772C93.6735 52.3481 93.3682 52.4394 93.056 52.44L19.746 52.5C19.2983 52.5 18.8554 52.4064 18.4459 52.2252C18.0364 52.0441 17.6693 51.7793 17.368 51.448L1.75605 34.248C1.54572 34.0173 1.40691 33.7304 1.35649 33.4223C1.30607 33.1142 1.3462 32.7981 1.47202 32.5124C1.59783 32.2266 1.80391 31.9836 2.06523 31.8128C2.32654 31.6419 2.63185 31.5506 2.94405 31.55L76.256 31.49C76.7035 31.4903 77.146 31.584 77.5551 31.7652C77.9642 31.9463 78.3311 32.2109 78.632 32.542L94.244 49.742ZM17.368 1.052C17.669 0.720916 18.0359 0.456328 18.445 0.275176C18.8541 0.0940234 19.2966 0.000298083 19.744 0L93.056 0.06C93.3682 0.0606347 93.6735 0.151917 93.9349 0.322758C94.1962 0.493599 94.4023 0.736647 94.5281 1.02238C94.6539 1.30811 94.694 1.62423 94.6436 1.93234C94.5932 2.24044 94.4544 2.52728 94.244 2.758L78.632 19.948C78.3308 20.2793 77.9637 20.5441 77.5542 20.7252C77.1447 20.9064 76.7018 21 76.254 21L2.94405 20.94C2.63185 20.9394 2.32654 20.8481 2.06523 20.6772C1.80391 20.5064 1.59783 20.2634 1.47202 19.9776C1.3462 19.6919 1.30607 19.3758 1.35649 19.0677C1.40691 18.7596 1.54572 18.4727 1.75605 18.242L17.368 1.052Z"
                fill="url(#paint0_linear)" />
            </g>
            <defs>
              <linearGradient
                id="paint0_linear"
                x1="4.16805"
                y1="85.832"
                x2="91.8321"
                y2="-1.832"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#9945FF" />
                <stop offset="0.2" stop-color="#7962E7" />
                <stop offset="1" stop-color="#00D18C" />
              </linearGradient>
              <clipPath id="clip0">
                <rect width="96" height="84" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </a>
      </div>
      <div class="text-sm items-center">
        By <a href="https://twitter.com/dimfeld">@dimfeld</a> for <a href="https://buildspace.so">Buildspace</a> Solana Intro
        Project
      </div>
    </footer>
  </div>
</div>

<style>
  footer svg {
    display: inline;
    width: 2rem;
    height: 2rem;
  }

  footer a {
    @apply underline;
  }
</style>
