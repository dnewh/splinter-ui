/**
 * Copyright 2018-2021 Cargill Incorporated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import proptypes from 'prop-types';
import { encryptKey, getSharedConfig } from 'splinter-saplingjs';
import { Secp256k1Context, Secp256k1PrivateKey } from 'transact-sdk-javascript';
import Icon from '@material-ui/core/Icon';
import crypto from 'crypto';
import { Loader } from '../Loader';
import { http } from '../http';
import './NewKey.scss';

export function NewKey({keys, setKeys}) {
  const [state, setState] = useState({
    name: null,
    publicKey: null,
    privateKey: null,
    password: null
  });
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(null);
  const [error, setError] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const reset = () => {
    setState({
      name: null,
      publicKey: null,
      privateKey: null,
      password: null
    });
    setError(null);
    setLoading(false);
  };

  function CancelKey() {
    reset();
    window.location.replace('/profile');
  }

  const submitAddKey = async event => {
    event.preventDefault();
    setLoading(true);

    // Validate the public and private keys are related:
    const context = new Secp256k1Context();
    try {
      const privateKey = Secp256k1PrivateKey.fromHex(state.privateKey);
      const publicKey = context.getPublicKey(privateKey).asHex().toLowerCase();
      const submittedPublicKey = state.publicKey.trim().toLowerCase();
      if (publicKey !== submittedPublicKey) {
        setError("The private key provided is not valid for the given public key.");
        setLoadingState('failure');
        return;
      }
    } catch (err) {
        setError("The private key provided is not a valid key.");
        setLoadingState('failure');
        return;
    }

    const canopyUser = JSON.parse(window.sessionStorage.getItem('CANOPY_USER'));
    const keySecret = crypto
      .createHash('sha256')
      .update(state.password)
      .digest('hex');
    const encryptedPrivateKey = JSON.parse(
      encryptKey(state.privateKey, keySecret)
    );
    const body = JSON.stringify({
      display_name: state.name,
      encrypted_private_key: encryptedPrivateKey,
      public_key: state.publicKey,
      user_id: canopyUser.userId
    });

    try {
      const { splinterURL } = getSharedConfig().canopyConfig;
      await http('POST', `${splinterURL}/biome/keys`, body, request => {
        request.setRequestHeader('Authorization', `Bearer ${canopyUser.token}`);
      });
      reset();
      setKeys([...keys, JSON.parse(body)]);
      window.location.href = '/profile';
    } catch (err) {
      try {
        const e = JSON.parse(err);
        setError(e.message);
      } catch {
        setError(err.toString());
      }
      setLoadingState('failure');
    }
  }

  const handleChange = event => {
    const { name, value } = event.target;
    setState({
      ...state,
      [name]: value
    });
  };

  const generateKeys = e => {
    e.preventDefault();
    setReadOnly(true);
    const context = new Secp256k1Context();
    const privKey = context.newRandomPrivateKey();
    const pubKey = context.getPublicKey(privKey);
    setState({
      ...state,
      publicKey: pubKey.asHex(),
      privateKey: privKey.asHex()
    });
  };

  const disabled = !(
    state.name &&
    state.privateKey &&
    state.publicKey &&
    state.password
  );

  return (
    <div id="new-key">
        <div className="header" />
        <div className="form-box">
          <div className="form-header">
            <div className="header-icon">
              <Icon>vpn_key_icon</Icon>
            </div>
            Create Key
          </div>
          <div className="line" />
          <div className="key-form">
            {!loading && (
              <form id="new-key-form">
                <div className="input">
                  <label htmlFor="key-name">
                    <div className="field-required">
                      Key Name
                      <div className="required-indicator">*</div>
                    </div>
                    <input
                      type="text"
                      id="key-name"
                      name="name"
                      value={state.name}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>
                <div className="input">
                  <label htmlFor="public-key">
                    <div className="field-required">
                      Public Key
                      <div className="required-indicator">*</div>
                    </div>
                    <input
                      type="text"
                      id="public-key"
                      name="publicKey"
                      value={state.publicKey}
                      onChange={handleChange}
                      required
                      readOnly={readOnly}
                    />
                    </label>
                </div>
                <div className="input">
                  <label htmlFor="private-key">
                    <div className="field-required">
                      Private Key
                      <div className="required-indicator">*</div>
                    </div>
                    <div className="generate-key">
                      <input
                        type="password"
                        id="private-key"
                        name="privateKey"
                        value={state.privateKey}
                        onChange={handleChange}
                        required
                        readOnly={readOnly}
                      />
                      <button
                        className="generate-button"
                        type="button"
                        title="Generate public and private key pair"
                        onClick={generateKeys}
                      >
                        <Icon>refresh_icon</Icon>
                      </button>
                    </div>
                  </label>
                </div>
                <div className="input">
                  <label htmlFor="password">
                    <div className="field-required">
                      Password
                      <div className="required-indicator">*</div>
                    </div>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={state.password}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>
                <div className="action-buttons">
                  <button
                    id="cancel"
                    type="button"
                    onClick={CancelKey}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-key"
                    type="submit"
                    disabled={disabled}
                    onClick={submitAddKey}
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
            {loading && <Loader state={loadingState} />}
            {error && (
              <div className="error-wrapper">
                <div
                  className="error"
                  style={{ color: 'var(--color-failure', wordWrap: 'break-word' }}
                >
                  <span>{error}</span>
                </div>
                <div className="actions">
                  <button id="error-reset" onClick={reset} type="button">Reset</button>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

NewKey.propTypes = {
  keys: proptypes.arrayOf(proptypes.object).isRequired,
  setKeys: proptypes.func.isRequired
};
