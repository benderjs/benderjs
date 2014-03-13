function Client(data) {
    this.id = data.id;
    this.userAgent = data.userAgent;
    this.socket = data.socket;
    this.busy = false;
}

module.exports.Client = Client;
