const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4');

function AccessToken(apiKey, secret, options) {
    if (!apiKey) {
        throw new Error('apiKey is required');
    }
    if (!secret) {
        throw new Error('secret is required');
    }
    options = options || {};
    this.apiKey = apiKey;
    this.secret = secret;
    this.audience = options.audience || 'apiRTC';
    this.ttl = options.ttl || 3600;
    this.apiRTC_UserAgent_Id = options.apiRTC_UserAgent_Id;
}
AccessToken.ALGORITHM = 'HS256';
AccessToken.prototype.toJwt = function() {
    let payload = {
        grants: {
            apiRTC_UserAgent_Id: this.apiRTC_UserAgent_Id
        }
    };
    return jwt.sign(payload, this.secret, {
        header: {
            typ: 'JWT'
        },
        algorithm: AccessToken.ALGORITHM,
        subject: this.apiKey,
        audience: this.audience,
        expiresIn: this.ttl,
        jwtid: uuidv4()
    })
};
module.exports = AccessToken;