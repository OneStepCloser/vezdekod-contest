const fs = require('fs')

export default function handler(req, res) {
    const body = JSON.parse(req.body);

    fs.writeFileSync(`./db/${body.id}.json`, JSON.stringify(body.data, null, '  '));
    return res.status(200).json({});
}
