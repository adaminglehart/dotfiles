function atob
    node -e "console.log(Buffer.from('$argv', 'base64').toString('utf-8'))"
end
