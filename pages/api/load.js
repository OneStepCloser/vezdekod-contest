const fs = require('fs')

export default function handler(req, res) {
    const id = req.query.id;
    const data = fs.readFileSync(`./db/${id}.json`).toString();
    const obj = JSON.parse(data);

    return res.status(200).json(obj);
}
