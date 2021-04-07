import {
  Address,
  AddressType,
  getDefaultPrefix,
  HashType,
  Platform,
  Provider,
  Script
} from '@lay2/pw-core';
import { createHash } from 'crypto';

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
      this.msgHandler = event => {
        if (typeof event.data === 'object' && 'upact' in event.data) {
          const msg = event.data as UnipassMessage;
          if (msg.upact === 'UP-READY') {
            const msg: UnipassMessage = { upact: 'UP-LOGIN' };
            event.source &&
              (event.source as Window).postMessage(msg, event.origin);
          } else if (msg.upact === 'UP-LOGIN') {
            const { pubkey, email } = msg.payload as UnipassAccount;
            const ckbAddress = pubkeyToAddress(pubkey);
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
      this.openWindow('login');
    });
  }

  sign(message: string): Promise<string> {
    console.log('[UnipassProvider] message to sign', message);
    // message = createHash('SHA256').update(message).digest('hex').toString();
    // console.log('[UnipassProvider] message hash', message);
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
      this.openWindow('sign');
    });
  }
  close() {
    this.msgHandler && window.removeEventListener('message', this.msgHandler);
  }
  openWindow(title: string) {
    window.open(
      `${this.UNIPASS_BASE}/#/${title}`,
      title,
      `toolbar=no,
      location=no,
      status=no,
      menubar=no,
      scrollbars=yes,
      resizable=yes,
      top=30,
      left=20,
      width=360,
      height=640`
    );
    return false;
  }
}

function pubkeyToAddress(pubkey: string): string {
  const pubKeyBuffer = Buffer.from(pubkey.replace('0x', ''), 'hex');
  const hashHex =
    '0x' +
    createHash('SHA256')
      .update(pubKeyBuffer)
      .digest('hex')
      .toString()
      .slice(0, 40);
  // console.log('hashHex', hashHex);

  const script = new Script(
    '0x6843c5fe3acb7f4dc2230392813cb9c12dbced5597fca30a52f13aa519de8d33',
    hashHex,
    HashType.type
  );

  return script.toAddress(getDefaultPrefix()).toCKBAddress();
}
