local builtin = require('telescope.builtin')
vim.keymap.set(
  'n',
  '<leader>sh',
  builtin.help_tags,
  { desc = '[S]earch [H]elp' }
)
vim.keymap.set(
  'n',
  '<leader>sk',
  builtin.keymaps,
  { desc = '[S]earch [K]eymaps' }
)

vim.keymap.set(
  'n',
  '<leader>sf',
  builtin.find_files,
  { desc = '[S]earch [F]iles' }
)
vim.keymap.set('n', '<leader>.', function()
  builtin.find_files({ cwd = vim.fn.expand('%:p:h') })
end, { desc = '[S]earch [.] Files in directory of the current buffer' })

vim.keymap.set(
  'n',
  '<leader>ss',
  builtin.builtin,
  { desc = '[S]earch [S]elect Telescope' }
)
vim.keymap.set(
  'n',
  '<leader>sw',
  builtin.grep_string,
  { desc = '[S]earch current [W]ord' }
)
vim.keymap.set(
  'n',
  '<leader>sg',
  builtin.live_grep,
  { desc = '[S]earch by [G]rep' }
)
vim.keymap.set(
  'n',
  '<leader>sd',
  builtin.diagnostics,
  { desc = '[S]earch [D]iagnostics' }
)
vim.keymap.set(
  'n',
  '<leader>sr',
  builtin.resume,
  { desc = '[S]earch [R]esume' }
)
vim.keymap.set(
  'n',
  '<leader>s.',
  builtin.oldfiles,
  { desc = '[S]earch Recent Files ("." for repeat)' }
)
vim.keymap.set(
  'n',
  '<leader><leader>',
  builtin.buffers,
  { desc = '[ ] Find existing buffers' }
)

vim.keymap.set('n', '<leader>/', function()
  builtin.current_buffer_fuzzy_find(require('telescope.themes').get_dropdown({
    winblend = 10,
  }))
end, { desc = '[/] Fuzzily search in current buffer' })

vim.keymap.set('n', '<leader>s/', function()
  builtin.live_grep({
    -- grep_open_files = true,
    prompt_title = 'Live Grep in Open Files',
  })
end, { desc = '[S]earch [/] in Open Files' })

vim.keymap.set('n', '<leader>sn', function()
  builtin.find_files({ cwd = vim.fn.stdpath('config') })
end, { desc = '[S]earch [N]eovim files' })

vim.keymap.set(
  'n',
  '<leader>gn',
  ':GpChatNew vsplit<cr>',
  { desc = 'open Chat [G]PT in a [N]ew window' }
)
vim.keymap.set(
  'n',
  '<leader>gt',
  ':GpChatToggle vsplit<cr>',
  { desc = 'open Chat [G]PT in a [T]oggleable window' }
)
vim.keymap.set(
  'n',
  '<leader>gs',
  ':GpChatFinder<cr>',
  { desc = 'Chat [G]PT [S]earch' }
)

vim.keymap.set('n', '<leader>gc', ':GpVnew<cr>', { desc = 'Chat [G]PT [C]ode' })
return {}
