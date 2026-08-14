vim.cmd.hi 'Comment gui=none'

require('telescope').load_extension 'file_browser'

vim.keymap.set('n', '<leader>fb', function()
  require('telescope').extensions.file_browser.file_browser()
end)

vim.keymap.set('n', '\\', function()
  require('telescope').extensions.file_browser.file_browser()
end)

vim.cmd([[colorscheme rose-pine]])

return {}
