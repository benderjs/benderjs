module.exports = {
    name: 'utils',

    attach: function () {
        var utils = this.utils = {},
            tplPattern = /(?:%)(\w+)(?:%)/g;

        /**
         * Render HTML content as the given response
         * @param  {Object} res  HTTP response
         * @param  {String} html HTML to render
         */
        utils.renderHTML = function (res, html) {
            res.writeHead(200, { Content: 'text/html' });
            res.end(html);
        };

        /**
         * Replace %NAME% tags with properties of the given data object
         * @param  {String} tpl  Template string
         * @param  {Object} data Data object
         * @return {String}
         */
        utils.template = function (tpl, data) {
            return tpl.replace(tplPattern, function (match, param) {
                return typeof data == 'object' && data[param];
            });
        };
    }
};
