// License Validation Module
// Handles validation of licenses and machine verification

const crypto = require('crypto');
const { decrypt } = require('./encrypt');
const { getMachineFingerprint } = require('./generate');

class LicenseValidator {
  constructor() {
    this.appName = 'Shreem POS';
    this.version = '1.0.0';
  }

  // Validate license key
  async validateLicense(licenseKey) {
    try {
      // Check license key format
      if (!this.validateLicenseKeyFormat(licenseKey)) {
        return {
          valid: false,
          error: 'INVALID_FORMAT',
          message: 'License key format is invalid'
        };
      }

      // Decrypt and parse license
      const licenseData = await this.decryptLicense(licenseKey);
      
      if (!licenseData) {
        return {
          valid: false,
          error: 'DECRYPTION_FAILED',
          message: 'Failed to decrypt license key'
        };
      }

      // Verify signature
      const signatureValid = this.verifySignature(licenseData);
      if (!signatureValid) {
        return {
          valid: false,
          error: 'INVALID_SIGNATURE',
          message: 'License signature is invalid'
        };
      }

      // Check app name and version
      if (licenseData.data.appName !== this.appName) {
        return {
          valid: false,
          error: 'INVALID_APP',
          message: 'License is for a different application'
        };
      }

      // Check expiration
      const expirationCheck = this.checkExpiration(licenseData.data);
      if (!expirationCheck.valid) {
        return expirationCheck;
      }

      // Verify machine fingerprint
      const machineCheck = await this.verifyMachine(licenseData.data);
      if (!machineCheck.valid) {
        return machineCheck;
      }

      // Check license status
      const statusCheck = await this.checkLicenseStatus(licenseData.data.id);
      if (!statusCheck.valid) {
        return statusCheck;
      }

      return {
        valid: true,
        license: licenseData.data,
        features: licenseData.data.features || [],
        restrictions: licenseData.data.restrictions || {},
        expiresAt: licenseData.data.expiresAt,
        type: licenseData.data.type,
        metadata: licenseData.data.metadata || {}
      };

    } catch (error) {
      return {
        valid: false,
        error: 'VALIDATION_ERROR',
        message: error.message
      };
    }
  }

  // Validate license key format
  validateLicenseKeyFormat(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return false;
    }
    
    const parts = licenseKey.split('.');
    if (parts.length !== 2) {
      return false;
    }
    
    const [base64Part, checksum] = parts;
    
    // Check if base64 part is valid
    try {
      const decoded = Buffer.from(base64Part, 'base64');
      if (decoded.length === 0) {
        return false;
      }
    } catch (error) {
      return false;
    }
    
    // Check if checksum is valid (8 characters)
    if (!/^[a-f0-9]{8}$/i.test(checksum)) {
      return false;
    }
    
    // Verify checksum
    const calculatedChecksum = this.calculateChecksum(base64Part);
    return calculatedChecksum.toLowerCase() === checksum.toLowerCase();
  }

  // Calculate checksum for license key
  calculateChecksum(data) {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return hash.substring(0, 8);
  }

  // Decrypt license key
  async decryptLicense(licenseKey) {
    try {
      const [base64Part] = licenseKey.split('.');
      const decrypted = decrypt(Buffer.from(base64Part, 'base64'));
      const licensePayload = JSON.parse(decrypted.toString());
      
      return licensePayload;
    } catch (error) {
      throw new Error(`License decryption failed: ${error.message}`);
    }
  }

  // Verify digital signature
  verifySignature(licensePayload) {
    try {
      const publicKey = process.env.LICENSE_PUBLIC_KEY || this.getDefaultPublicKey();
      
      const { data, signature } = licensePayload;
      const dataString = JSON.stringify(data, Object.keys(data).sort());
      const hash = crypto.createHash('sha256').update(dataString).digest();
      
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      return crypto.verify('RSA-SHA256', hash, publicKey, signatureBuffer);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  // Get default public key (for development only)
  getDefaultPublicKey() {
    // Simple public key for development
    return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu7lfJFYUCcydfCubTmG
Dexuz1/Ni/VtSu2dxBeBuh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iex
y/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF
+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEU
lk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/
S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2
R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/Djd
Dtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+
iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVt
F+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEU
lk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/
DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+B
uh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1
fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0N
EUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/
S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R
+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1P
F1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0
NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy
/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2
R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDt
z0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdD
tz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+ie
xy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+
d2R+Buh+iexy/S/DjdDtz0NEUlk1u1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u
1PF1fVtF+d2R+Buh+iexy/S/DjdDtz0NEUlk1u1/disable
-----END PUBLIC Schnell PUBLIC datei-----`;
  }

  // Check license expiration
  checkExpiration(licenseData) {
    if (!licenseData.expiresAt) {
      // Perpetual license
      return { valid: true };
    }

    const now = new Date();
    const expirationDate = new Date(licenseData.expiresAt);

    if (now > expirationDate) {
      return {
        valid: false,
        error: 'EXPIRED',
        message: 'License has expired',
        expiredAt: expirationDate
      };
    }

    // Check if license is expiring soon (within 7 days)
    const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysUntilExpiration <= 7;

    return {
      valid: true,
      expiresAt: expirationDate,
      daysUntilExpiration,
      isExpiringSoon
    };
  }

  // Verify machine fingerprint
  async verifyMachine(licenseData) {
    try {
      const currentFingerprint = await getMachineFingerprint();
      
      if (!licenseData.machineFingerprint) {
        return {
          valid: false,
          error: 'NO_MACHINE_FINGERPRINT',
          message: 'License is not bound to a machine'
        };
      }

      // Check if current machine matches licensed machine
      if (licenseData.machineFingerprint !== currentFingerprint) {
        return {
          valid: false,
          error: 'MACHINE_MISMATCH',
          message: 'License is not valid for this machine',
          licensedMachine: licenseData.machineFingerprint,
          currentMachine: currentFingerprint
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'MACHINE_VERIFICATION_ERROR',
        message: `Machine verification failed: ${error.message}`
      };
    }
  }

  // Check license status from database
  async checkLicenseStatus(licenseId) {
    try {
      // This would typically check against a database or licensing server
      // For now, we'll implement basic offline validation
      
      // In a real implementation, you might:
      // 1. Check if license has been revoked
      // 2. Check if license is blacklisted
      // 3. Verify license hasn't exceeded usage limits
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'STATUS_CHECK_ERROR',
        message: `License status check failed: ${error.message}`
      };
    }
  }

  // Validate license feature access
  validateFeatureAccess(validationResult, feature) {
    if (!validationResult.valid) {
      return false;
    }

    const features = validationResult.features || [];
    return features.includes(feature);
  }

  // Check license restrictions
  checkRestrictions(validationResult, restriction) {
    if (!validationResult.valid) {
      return false;
    }

    const restrictions = validationResult.restrictions || {};
    return !restrictions[restriction];
  }

  // Get license information
  async getLicenseInfo(licenseKey) {
    const validation = await this.validateLicense(licenseKey);
    
    if (!validation.valid) {
      return null;
    }

    return {
      id: validation.license.id,
      type: validation.type,
      features: validation.features,
      restrictions: validation.restrictions,
      expiresAt: validation.expiresAt,
      metadata: validation.metadata,
      issuedAt: validation.license.issuedAt,
      issuedTo: validation.license.issuedTo,
      appName: validation.license.appName,
      version: validation.license.version
    };
  }

  // Validate license for specific action
  async validateForAction(licenseKey, action, context = {}) {
    const validation = await this.validateLicense(licenseKey);
    
    if (!validation.valid) {
      return {
        allowed: false,
        reason: validation.error,
        message: validation.message
      };
    }

    // Check if action requires specific feature
    if (action.feature && !this.validateFeatureAccess(validation, action.feature)) {
      return {
        allowed: false,
        reason: 'FEATURE_NOT_ALLOWED',
        message: `License does not include required feature: ${action.feature}`
      };
    }

    // Check if action is restricted
    if (action.restriction && !this.checkRestrictions(validation, action.restriction)) {
      return {
        allowed: false,
        reason: 'RESTRICTED_ACTION',
        message: `Action is restricted: ${action.restriction}`
      };
    }

    return {
      allowed: true,
      validation
    };
  }
}

module.exports = { LicenseValidator };
