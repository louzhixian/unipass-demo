<template>
  <q-page class="flex-center justify-evenly">
    <q-card class="my-card">
      <q-card-section class="q-gutter-sm">
        <div class="row"> <b>EMAIL:</b> {{provider && provider.email}} </div>
        <div class="row" style="word-break:break-all;"> <b>ADDRESS:</b> {{provider && provider.address}} </div>
        <q-btn class="full-width" color="primary" type="submit" icon="login" label="Login" @click="login" />
      </q-card-section>
      <q-separator spaced />
      <q-card-section class="q-gutter-sm">
        <div class="row"><q-input class="full-width" v-model="toAddress" type="text" label="TO:" /></div>
        <div class="row"><q-input class="full-width" v-model="toAmount" type="number" suffix=" CKB" /></div>
        <q-btn class="full-width" color="info" icon="send" label="Send" @click="send" />
        <div class="row" style="word-break:break-all;"><b>TX:</b> <a :href="`https://explorer.nervos.org/aggron/transaction/${txHash}`">{{ txHash }}</a></div>
      </q-card-section>
      <q-separator spaced />
      <q-card-section class="q-gutter-sm">
        <div class="row"><q-input class="full-width" v-model="message" type="text" label="Message" /></div>
        <q-btn class="full-width" color="info" icon="check" label="Sign" @click="sign" />
        <div class="row" style="word-break:break-all;"><b>SIGNATURE:</b> {{ signature }}</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script lang="ts">
import PWCore, { Address, AddressType, Amount, PwCollector } from '@lay2/pw-core';
import { defineComponent, ref } from '@vue/composition-api';
import UnipassProvider from 'src/components/UnipassProvider';

export default defineComponent({
  name: 'PageIndex',
  setup() {
    const provider = ref<UnipassProvider>();
    const message = ref('');
    const signature = ref('');
    const toAddress = ref('');
    const toAmount = ref(0);
    const txHash = ref('');
    const pw = ref<PWCore>();
    return { pw, provider, toAddress, toAmount, txHash, message, signature };
  },
  methods: {
    async login() {
      this.pw = await new PWCore('https://testnet.ckb.dev').init(
        // new UnipassProvider('http://localhost:8080'),
        new UnipassProvider(),
        new PwCollector('https://cellapitest.ckb.pw')
      );
      this.provider = PWCore.provider as UnipassProvider;
      console.log('UnipassProvider inited', this.pw.rpc); 
    },
    async send() {
      if(!this.provider || !this.pw) throw new Error('Need Login');
      this.txHash = await this.pw.send(new Address(this.toAddress, AddressType.ckb), new Amount(`${this.toAmount}`))
    },
    async sign() {
      if(!this.provider) throw new Error('Need Login');
      console.log('[sign] message: ', this.message);
      this.signature = await this.provider.sign(this.message);
    }
  }
});
</script>
