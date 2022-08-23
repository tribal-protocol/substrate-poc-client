# Orchestrator and Test Utility

## The Stack

* `svelte` (for UX purposes only)
* `typescript`
* `@polkadot-js/api@^9.0.1`
* `@polkadot-js/api-contract@^9.0.1`
* `@polkadot/keyring@^10.1.2`

## How to use
    NOTE: This section will evolve as the orchestrator, or test utility evolves. 

We’ve developed an Orchestrator test utility that allows a user to test orchestrator functionality. At this time, the test utility allows users to connect to a local dev substrate chain, and create tribes.

To use this utility:

* clone this repo.
* `npm i`
* `npm run dev`
* `start your local dev cluster.`
* Click “Connect to Local Devnet”, and select a Dev user to work against
* Click “Create Tribe as …” and fill out the form that appears, and click “Submit” **DO NOT CLICK THIS TWICE**
* A status message should show at the top of the page

Once complete, a tribe will appear in the list of tribes found in localStorage.

![test utility frontend](https://mirror.xyz/_next/image?url=https%3A%2F%2Fimages.mirror-media.xyz%2Fpublication-images%2FbOdn-oD0TjDJiYIOjKuSA.png&w=1920&q=90)