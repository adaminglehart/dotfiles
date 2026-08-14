vim.keymap.set('n', 's', '<Nop>', { desc = 'Unbind the default s key' })
vim.keymap.set(
  'n',
  '<leader>sv.',
  ':source $MYVIMRC<cr>',
  { desc = 'Reload Neovim config' }
)

vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>')

vim.keymap.set(
  'n',
  '<leader>q',
  vim.diagnostic.setloclist,
  { desc = 'Open diagnostic [Q]uickfix list' }
)

-- Exit terminal mode in the builtin terminal
vim.keymap.set(
  't',
  '<Esc><Esc>',
  '<C-\\><C-n>',
  { desc = 'Exit terminal mode' }
)

--  Use CTRL+<hjkl> to switch between windows
vim.keymap.set(
  'n',
  '<C-h>',
  '<C-w><C-h>',
  { desc = 'Move focus to the left window' }
)
vim.keymap.set(
  'n',
  '<C-l>',
  '<C-w><C-l>',
  { desc = 'Move focus to the right window' }
)
vim.keymap.set(
  'n',
  '<C-j>',
  '<C-w><C-j>',
  { desc = 'Move focus to the lower window' }
)
vim.keymap.set(
  'n',
  '<C-k>',
  '<C-w><C-k>',
  { desc = 'Move focus to the upper window' }
)

vim.keymap.set(
  'n',
  '<C-d>',
  '<C-d>zz',
  { desc = 'Remap <C-d> to scroll down and center the cursor' }
)
vim.keymap.set(
  'n',
  '<C-u>',
  '<C-u>zz',
  { desc = 'Remap <C-u> to scroll up and center the cursor' }
)
vim.keymap.set(
  'n',
  '<C-f>',
  '<C-f>zz',
  { desc = 'Remap <C-f> to scroll down and center the cursor' }
)
vim.keymap.set(
  'n',
  '<C-b>',
  '<C-B>zz',
  { desc = 'Remap <C-b> to scroll up and center the cursor' }
)

-- [[ Telescope Keymaps ]]

return {}
