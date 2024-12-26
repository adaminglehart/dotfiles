vim.o.background = 'light'
vim.cmd.colorscheme 'tokyonight'
vim.cmd.hi 'Comment gui=none'

require('telescope').load_extension 'file_browser'

vim.keymap.set('n', '<space>fb', function()
  require('telescope').extensions.file_browser.file_browser()
end)

return {}
