const app = require("./public/server");
const PORT = process.env.PORT || 1415;
const IP=process.env.IP;

app.listen(PORT,IP, ()=> {
    console.log(`Servet waiting at http:/${IP}:${PORT}`);
});