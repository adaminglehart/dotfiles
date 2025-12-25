function btoa
    node -e "console.log(Buffer.from('$argv').toString('base64'))"
end
