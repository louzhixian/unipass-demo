import {
  Address,
  AddressType,
  getDefaultPrefix,
  HashType,
  Platform,
  Provider,
  Script
} from '@lay2/pw-core';

type UP_ACT = 'UP-READY' | 'UP-LOGIN' | 'UP-SIGN' | 'UP-CLOSE';

export interface UnipassAccount {
  pubkey: string;
  email: string;
}
export interface UnipassMessage {
  upact: UP_ACT;
  payload?: string | UnipassAccount;
}

export default class UnipassProvider extends Provider {
  private _email: string | undefined;
  private msgHandler:
    | ((this: Window, event: MessageEvent) => unknown)
    | undefined;

  get email() {
    return this._email;
  }

  constructor(private readonly UNIPASS_BASE = 'https://unipass.vercel.app') {
    super(Platform.ckb);
  }

  async init(): Promise<UnipassProvider> {
    return new Promise(resolve => {
      this.msgHandler = async event => {
        if (typeof event.data === 'object' && 'upact' in event.data) {
          const msg = event.data as UnipassMessage;
          if (msg.upact === 'UP-READY') {
            const msg: UnipassMessage = { upact: 'UP-LOGIN' };
            event.source &&
              (event.source as Window).postMessage(msg, event.origin);
          } else if (msg.upact === 'UP-LOGIN') {
            const { pubkey, email } = msg.payload as UnipassAccount;
            const ckbAddress = await pubkeyToAddress(pubkey);
            this.address = new Address(ckbAddress, AddressType.ckb);
            this._email = email;
            this.msgHandler &&
              window.removeEventListener('message', this.msgHandler);
            (event.source as Window).close();
            resolve(this);
          }
        }
      };

      window.addEventListener('message', this.msgHandler, false);
      window.open(this.UNIPASS_BASE + '/#/login');
    });
  }

  sign(message: string): Promise<string> {
    console.log('[UnipassProvider] message to sign', message);
    return new Promise(resolve => {
      this.msgHandler = event => {
        if (typeof event.data === 'object' && 'upact' in event.data) {
          const msg = event.data as UnipassMessage;
          if (msg.upact === 'UP-READY') {
            event.source &&
              (event.source as Window).postMessage(
                {
                  upact: 'UP-SIGN',
                  payload: message || 'N/A'
                } as UnipassMessage,
                event.origin
              );
          } else if (msg.upact === 'UP-SIGN') {
            const signature = msg.payload as string;
            console.log('[Sign] signature: ', signature);
            this.msgHandler &&
              window.removeEventListener('message', this.msgHandler);
            (event.source as Window).close();
            resolve('0x' + signature);
          }
        }
      };

      window.addEventListener('message', this.msgHandler, false);
      window.open(this.UNIPASS_BASE + '/#/sign');
    });
  }
  close() {
    this.msgHandler && window.removeEventListener('message', this.msgHandler);
  }
}

async function pubkeyToAddress(pubkey: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(pubkey); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  const script = new Script(
    '0x6843c5fe3acb7f4dc2230392813cb9c12dbced5597fca30a52f13aa519de8d33',
    hashHex,
    HashType.type
  );

  return script.toAddress(getDefaultPrefix()).toCKBAddress();
}
