import Keyring from "@polkadot/keyring";
import { writable} from "svelte/store";

let keyring = new Keyring({type: "ed25519"});

export const selectedUser = writable({
    name: null,
    seed: ""
});