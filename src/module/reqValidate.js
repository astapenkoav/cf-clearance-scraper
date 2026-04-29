const Ajv = require("ajv")
const addFormats = require("ajv-formats")

const ajv = new Ajv()
addFormats(ajv)

const schema = {
    "type": "object",
    "properties": {
        "mode": {
            "type": "string",
            "enum": ["source", "turnstile-min", "turnstile-max", "waf-session"],
        },
        "proxy": {
            "type": "object",
            "properties": {
                "host": { "type": "string" },
                "port": { "type": "integer" },
                "username": { "type": "string" },
                "password": { "type": "string" }
            },
            "additionalProperties": false
        },
        "url": {
            "type": "string",
            "format": "uri",
        },
        "authToken": {
            "type": "string"
        },
        "siteKey": {
            "type": "string"
        },
        "waitForMs": {
            "type": "integer",
            "minimum": 0,
            "maximum": 30000
        },
        "waitForSelector": {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
        },
        "waitForSelectorTimeout": {
            "type": "integer",
            "minimum": 0,
            "maximum": 60000
        },
        "cookies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "value": { "type": "string" },
                    "domain": { "type": "string" },
                    "path": { "type": "string" },
                    "secure": { "type": "boolean" },
                    "httpOnly": { "type": "boolean" },
                    "expires": { "type": "number" }
                },
                "required": ["name", "value"],
                "additionalProperties": true
            }
        }
    },
    "required": ["mode", "url"],
    "additionalProperties": false
}

// const data = {
//     mode: "source",
//     url: "https://example.com",
//     proxy: {
//         host: "localhost",
//         port: 8080,
//         username: "test",
//         password: "test"
//     },
//     authToken: "123456"
// }


function validate(data) {
    const valid = ajv.validate(schema, data)
    if (!valid) return ajv.errors
    else return true
}

module.exports = validate