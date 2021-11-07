use anchor_lang::prelude::*;
use anchor_lang::AccountsClose;

declare_id!("DkZNiYb8jAQJA4qdPmhn8dutfHsGbwVMb1zNoSQceBkq");

#[program]
pub mod buildspace_gif_wall {
    use super::*;
    pub fn new_list(ctx: Context<NewList>, bump: u8) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        base_account.bump = bump;
        base_account.gifs = Vec::new();
        Ok(())
    }

    pub fn delete_list(ctx: Context<NewList>) -> ProgramResult {
        let user = &ctx.accounts.user;
        let base_account = &mut ctx.accounts.base_account;
        base_account.close(user.to_account_info())?;

        Ok(())
    }

    pub fn add_gif(ctx: Context<AddGif>, url: String) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        base_account.gifs.push(GifItem {
            url,
            adder: *ctx.accounts.user.to_account_info().key,
            votes: 0,
        });
        Ok(())
    }

    pub fn upvote(ctx: Context<AddGif>, url: String) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        let item = base_account
            .gifs
            .iter_mut()
            .find(|item| item.url == url)
            .ok_or(Err::NoItemFound)?;
        item.votes += 1;
        Ok(())
    }
}

#[error]
pub enum Err {
    #[msg("No item with that url found")]
    NoItemFound,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct NewList<'info> {
    #[account(init, payer=user, seeds=[
        b"giflist2",
        user.to_account_info().key.as_ref()],
        bump=bump,
        space=9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteList<'info> {
    #[account(mut, seeds=[
        b"giflist2",
        user.to_account_info().key.as_ref()],
        bump=base_account.bump
    )]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddGif<'info> {
    #[account(mut, seeds=[
        b"giflist2",
        list_owner.to_account_info().key.as_ref()
    ], bump=base_account.bump)]
    pub base_account: Account<'info, BaseAccount>,
    pub list_owner: UncheckedAccount<'info>,
    pub user: Signer<'info>,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct GifItem {
    url: String,
    adder: Pubkey,
    votes: u64,
}

#[account]
pub struct BaseAccount {
    pub bump: u8,
    pub gifs: Vec<GifItem>,
}
