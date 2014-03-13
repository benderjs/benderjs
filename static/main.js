(function () {
        

    function updateClientList(list) {
        clients.innerHTML = list.map(function (client) {
            return '<li>' + client.userAgent + '</li>';
        }).join('');
    }
})();
