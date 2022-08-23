import * as PolkaApi from "@polkadot/api";
import * as PolkaContract from "@polkadot/api-contract";
import { Writable, writable } from "svelte/store";
const { ApiPromise, WsProvider, Keyring, SubmittableResult } = PolkaApi;
const { BlueprintPromise, CodePromise, ContractPromise, Abi } = PolkaContract;

class NotImplementedError extends Error {
    constructor(message) {
        super(message)
        this.message = message;
    }
}

class InitialConfigurationError extends Error {
    constructor(message) {
        super(message)
        this.message = message;
    }
}
class NotConnectedError extends Error {
    constructor(message) {
        super(message)
        this.message = message;
    }
}

class TribeFounder {
    public publicKey: string;
    public initialFounder: boolean;
    public required: boolean;
    public picosRequested: number;
}

enum TribeStatus {
    NOT_DEFINED,
    DEFUNCT,
    ACTIVE
}

class Tribe {
    name: string;
    publicKey: string;
    creator: string;
    status: TribeStatus;
    tribeFounders: TribeFounder[];

    constructor(name: string, pk: string, creator: string, founders: TribeFounder[]) {
        this.publicKey = pk;
        this.creator = creator;
        this.tribeFounders = founders;
        this.name = name;
    }

    isActive(): boolean {
        return (this.status === TribeStatus.ACTIVE);
    }
}

export const hexStringToUint8Array = (hexString) => {
    if (hexString.length % 2 !== 0){
      throw "Invalid hexString";
    }
    var arrayBuffer = new Uint8Array(hexString.length / 2);
  
    for (var i = 0; i < hexString.length; i += 2) {
      var byteValue = parseInt(hexString.substr(i, 2), 16);
      if (isNaN(byteValue)){
        throw "Invalid hexString";
      }
      arrayBuffer[i/2] = byteValue;
    }
  
    return arrayBuffer;
  }

  const u8hex = (hex) => {
    let seed = hex;
    if (hex.startsWith("0x")) {
        seed = seed.split("0x").join("");
    }

    return hexStringToUint8Array(seed);
}


const gasLimit = 100000n * 1000000n;
const storageDepositLimit = null


class Orchestrator {
    private useTelemetry: boolean;
    private specifiedNode: string;
    private api: PolkaApi.ApiPromise | null;
    private codePromise: PolkaContract.CodePromise | null;
    public localTribes: Writable<Tribe[]>;
    public orchestratorConnected: Writable<boolean>;

    constructor(telemetry: boolean, nodeUri: string) {
        if (telemetry == null || telemetry == false) {
            if (typeof nodeUri == 'string') {
                this.specifiedNode = nodeUri;
            } else {
                throw new InitialConfigurationError("nodeUri cannot be null if telemetry is false");
            }
        } else {
            throw new NotImplementedError("telemetry not implemented yet.");
        }

        this.orchestratorConnected = writable(false);
        this.localTribes = writable([]);
    }

    loadLocalTribes() {
        let tribeStorage = localStorage.getItem("tribes");
        if (tribeStorage == null) {
            return;
        } 
        let tribes: Tribe[] = JSON.parse(tribeStorage);
        this.localTribes.set(tribes);
        return;
    }

    saveLocalTribes(tribe: Tribe) {
        let tribeStorage = localStorage.getItem("tribes");
        if (tribeStorage == null) {
            let tribes: Tribe[] = [tribe];
            localStorage.setItem("tribes", JSON.stringify(tribes));
        } else {
            let tribes: Tribe[] = JSON.parse(tribeStorage);
            tribes.push(tribe);
            localStorage.setItem("tribes", JSON.stringify(tribes));
        }

    }

    public getNewKeyring() {
        return new Keyring({type: "sr25519"})
    }


    async connect() {
        try {
        if (this.api == null) {
            this.api = new ApiPromise({
                provider: (!!this.specifiedNode && this.specifiedNode != "dev") ? new WsProvider(this.specifiedNode) : undefined,
                throwOnConnect: true,
                throwOnUnknown: true
            });
        }

        await this.api.isReadyOrError;

        if (this.api.isConnected == true) {
            if (this.codePromise == null) {
                let metadataFetch = await fetch("/contract/metadata.json");
                let metadata = await metadataFetch.json();
    
                let contractFetch = await fetch("/contract/tribe_contract.wasm");
                let contract = await contractFetch.arrayBuffer();
                this.codePromise = new CodePromise(
                    this.api, 
                    metadata, 
                    new Uint8Array(contract)
                );
            }
            this.loadLocalTribes();
            this.orchestratorConnected.set(true);    
        }
        
        } catch (ex) {
            this.orchestratorConnected.set(false);
            throw ex;
        }
    }
    
    async disconnect(): Promise<void> {
        if (this.api != null) {
            await this.api.disconnect();
            this.api = null;
        }

        if (this.codePromise != null) {
            this.codePromise = null;
        }

        this.orchestratorConnected.set(false);
    }

    // private signAndSend(keyPair, tx: ) {
    //     return new Promise((resolve, reject) => {
    //         tx.signAndSend(keyPair, rez => {
    //             console.log(rez);
    //         }).then(d => {
    //             resolve(d);
    //         }).catch(ex => reject(ex));
    //     });
    // }

    private async getContractMetadata() {
        let metadataFetch = await fetch("/contract/metadata.json");
        let metadata = await metadataFetch.json();
        return metadata;
    }

    async getCodePromise(address: string) {
        const meta = await this.getContractMetadata();
        if (this.api !== null) {
            return new ContractPromise(this.api, meta, address);
        } else {
            throw new NotConnectedError("connect to the chain beforehand");
        }
        
    }
  
    private signSendContractMethodNoReturn(tx, seed): Promise<boolean> {
        return new Promise((success, fail) => {
            let user = this.getNewKeyring().addFromUri(seed);
            let fin: any = null;
            let isDone = false;
            tx.signAndSend(user, (result) => {
                if (!!!isDone) {
                    fin = result;
                    let {isInBlock = null, isFinalized = null} = fin;
                    if (!!isInBlock || !!isFinalized) {
                        isDone = true;
                        return success(true);
                    }
                }
            }).then().catch(e => {
                return fail(e);
            })
        });
    }

    private signSendContractMethodMaybeReturn(tx, seed): Promise<boolean> {
        return new Promise((success, fail) => {
            let user = this.getNewKeyring().addFromUri(seed);
            let fin: any = null;
            let isDone = false;
            tx.signAndSend(user, (result) => {
                if (!!!isDone) {
                    fin = result;
                    console.log(fin);
                    // let {isInBlock = null, isFinalized = null} = fin;
                    // let isInBlock = null;
                    // let isFinalized = null;
                    let {events = [], status = null} = fin
                    console.log(status);
                    events.forEach(({ event, phase }) => {
                        if (this.api !== null) {
                        if (this.api.events.contracts.ContractsEmmitted.is(event)) {
                            this.getContractMetadata().then(m => {
                                const [account_id, contract_evt] = event.data

                                // decode
                                const decoded = new Abi(m).decodeEvent(contract_evt.toU8a())
                                console.log("event!");
                                console.log(decoded)
                            })
                           
                        }}
                      });
                    // if (!!isInBlock || !!isFinalized) {
                    //     isDone = true;
                    //     return success(true);
                    // }
                }
            }).then().catch(e => {
                return fail(e);
            })
        });
    }
    private queryMethoMaybeReturn(tx, seed): Promise<boolean> {
        return new Promise((success, fail) => {
            let user = this.getNewKeyring().addFromUri(seed);
            let fin: any = null;
            let isDone = false;
            tx.signAndSend(user, (result) => {
                if (!!!isDone) {
                    fin = result;
                    console.log(fin);
                    let {isInBlock = null, isFinalized = null} = fin;
                    if (!!isInBlock || !!isFinalized) {
                        isDone = true;
                        return success(true);
                    }
                }
            }).then().catch(e => {
                return fail(e);
            })
        });
    }
    async createTribeWithFounders(initName: string, 
        initialFounderSeed: string,
        initialFounder: TribeFounder, 
        founders: TribeFounder[]) {

            // this creates the tribe's public key.
            let tribeKey = await this.createTribe(initName, initialFounderSeed, initialFounder, founders);
            // add founders to tribe
            for (let founder of founders) {
                await this.addFounder(tribeKey, initialFounderSeed, founder);
            }
            // return tribeKey;
            let address = this.getNewKeyring().addFromUri(initialFounderSeed).address;

            let tribe = new Tribe(initName, tribeKey, address, founders);
            // add tribe to localStorage
            this.saveLocalTribes(tribe);
            this.loadLocalTribes();
            return tribe;

            
        }

    private async addFounder(
        tribePublicKey: string,
        seed: string,
        founder: TribeFounder
    ) {
        // get the code instance 

        const {
            publicKey: potentialFounder, 
            picosRequested: picos,
            required  
        } = founder;

        const contract = await this.getCodePromise(tribePublicKey);
        // potentialFounder, picos, required
        let tx = contract.tx.inviteFounder({gasLimit, storageDepositLimit}, potentialFounder, picos, required);

        return await this.signSendContractMethodNoReturn(tx, seed);
    }


    private createTribe(
        initName: string, 
        initialFounderSeed: string,
        initialFounder: TribeFounder, 
        founders: TribeFounder[]): Promise<any> {

        return new Promise((res, rej) => {
            if (this.api == undefined || this.codePromise == undefined) {
                return rej(new NotConnectedError("connect first."));
            } else if (!this.api.isConnected) {
                return rej(new NotConnectedError("connect first."));
            } else {
                let keyring = this.getNewKeyring();
                let user = keyring.addFromUri(initialFounderSeed);
                
                let initialFounderPicosNeeded = initialFounder.picosRequested;
        
                const tx = this.codePromise.tx.new({gasLimit, storageDepositLimit}, initName, initialFounderPicosNeeded);
                const value = this.api.registry.createType('Balance', 0);
        
                // let u8seed = u8hex(initialFounderSeed);
                // let u = await this.signAndSend(user, tx);
                let fin: any = null;
                let isDone = false;
                tx.signAndSend(user, (result) => {
                    if (!!!isDone) {
                        fin = result;
                        let {contract = null, isInBlock = null, isFinalized = null} = fin;
                        if (contract !== null && (!!isInBlock || !!isFinalized)) {
                            isDone = true;
                            return res(contract.address.toString())
                        }
                    }

                }).then().catch(e => {
                    return rej(e);
                })

            }  
        })
        // let tribe = new Tribe(initName, initialFounderKeyring.publicKeys.toString(), initialFounder.publicKey, founders);
        // return tribe;
    }

    async fundTribe(tribeKey: string, userSeed: string, picos: number): Promise<boolean> {
        // send moneys   
        try {
        let contract = await this.getCodePromise(tribeKey);
        let tx = contract.tx.fundTribe({gasLimit, storageDepositLimit, value: picos});
        return await this.signSendContractMethodMaybeReturn(tx, userSeed);
        } catch (ex) {
            console.error(ex);
            throw ex;
        }
    }

    async acceptTribe(tribeKey: string, userSeed: string): Promise<boolean> {
        let contract = await this.getCodePromise(tribeKey);
        let tx = contract.tx.acceptTribe({gasLimit, storageDepositLimit});
        return await this.signSendContractMethodNoReturn(tx, userSeed);
    }

    async rejectTribe(tribeKey: string, userSeed: string): Promise<boolean> {
        let contract = await this.getCodePromise(tribeKey);
        let tx = contract.tx.rejectTribe({gasLimit, storageDepositLimit});
        return await this.signSendContractMethodNoReturn(tx, userSeed);
    }

    // getTribe

    async getTribe(tribeKey: string, userSeed: string): Promise<string> {

        let contract = await this.getCodePromise(tribeKey); 
        let user = this.getNewKeyring().addFromUri(userSeed).address;
        let tx = await contract.query.getTribe(user, {storageDepositLimit, gasLimit});
        console.log(tx);

        return `${tx.output}`;

    }

    getTribeStatus(tribeKey: string, userSeed: string): TribeStatus {
        // active/defunct
        return TribeStatus.NOT_DEFINED;
    }

    getFounderStatus(tribeKey: string, tribeFounder: string, userSeed: string): string {
        return "";
    }
}



export {
    Orchestrator as default, 
    Tribe, 
    TribeFounder
};