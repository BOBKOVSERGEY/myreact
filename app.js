
var bs = require("browser-sync").create();

bs.watch(['*.*', '*/*/*.*', '*/*.*']).on("change", bs.reload);

// Start a Browsersync proxy
bs.init({
    server: "./"
});