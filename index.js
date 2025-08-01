const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
console.log('Mensaje recibido:', req.body);
res.sendStatus(200);
});

app.get('/', (req, res) => {
res.send('¡Sábilo está despierto!');
});

app.listen(PORT, () => {
console.log(`Servidor corriendo en puerto ${PORT}`);
});