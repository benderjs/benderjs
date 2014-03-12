(function () {
    var client = new Faye.Client('/faye', {
            timeout: 120
        }),
        clientsEl = document.getElementById('clients');

    client.subscribe('/client_list', function (list) {
        updateClientList(list);
    });

    function updateClientList(list) {
        clients.innerHTML = list.map(function (client) {
            return '<li>' + client.userAgent + '</li>';
        }).join('');
    }
})();
