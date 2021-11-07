import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { BuildspaceGifWall } from '../target/types/buildspace_gif_wall';
import { expect } from 'chai';

const { SystemProgram } = anchor.web3;

describe('buildspace-gif-wall', () => {

  // Configure the client to use the local cluster.
  let provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BuildspaceGifWall as Program<BuildspaceGifWall>;

  async function getListAddress() {
    let [baseAccount, bump] = await anchor.web3.PublicKey.findProgramAddress([
      Buffer.from("giflist"),
      provider.wallet.publicKey.toBytes(),
    ], program.programId);

    return { baseAccount, bump };
  }

  async function newList() {
    let { baseAccount, bump } = await getListAddress();

    let tx = await program.rpc.newList(bump, {
      accounts: {
        baseAccount,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }
    });

    let listData = await program.account.baseAccount.fetch(baseAccount);

    return { baseAccount, listData };
  }

  it('Creates a new list', async () => {
    console.log('🚀 Creating a new list...');
    const { listData } = await newList();
    console.log('Gif Count:', listData.gifs.length);
    console.log('PDA Bump:', listData.bump.toString());
  });

  it('Adds an item', async() => {
    let { baseAccount } = await getListAddress();
    let listData = await program.account.baseAccount.fetch(baseAccount);
    console.log('Initial GIFs', JSON.stringify(listData.gifs));

    await program.rpc.addGif('Some GIF', {
      accounts: {
        baseAccount,
        listOwner: provider.wallet.publicKey,
        user: provider.wallet.publicKey,
      }
    });

    listData = await program.account.baseAccount.fetch(baseAccount);
    console.log('GIFs after addGif', listData.gifs);
    expect(listData.gifs.length).eq(1);
  })
});
