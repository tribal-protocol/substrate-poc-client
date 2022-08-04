<script lang="ts">

  import svelteLogo from './assets/svelte.svg'
  import Counter from './lib/Counter.svelte'

  import b58 from 'noble-base58check';

  import {
    ApiPromise
  } from "@polkadot/api";
  import { onMount} from 'svelte';

  import {
    Container, Jumbotron, Alert, Button, Row, Col, Input, FormGroup, Label,Modal,
    ModalBody, ModalFooter, ModalHeader
  } from "sveltestrap";
import FounderDropdown from './lib/FounderDropdown.svelte';
import { selectedUser } from './lib/store';

import Orchestrator, { hexStringToUint8Array, Tribe, TribeFounder } from "./lib/orchestrator";
import { Writable, writable } from 'svelte/store';


  let orchestrator: Orchestrator;
  let showCreate: boolean = false;
  let theError: string = null;
  let theMessage: string = null;
  let isConnected: boolean = false;
  let localTribes: Tribe[] = [];

  // let potentialTribeMembers: Writable<TribeFounder[]> = writable([]);
  // let initialTribeName = writable("");
  // let initialFounderPicosRequested = writable(0);

  let potentialTribeMembers = [];
  let initialTribeName = "";
  let initialFounderPicosRequested = 0;

  let knownKeys = [];

  let actionModalOpen = false;
  let actionableTribe: Tribe | null = null;
  let actionError = null;
  let actionText = null;
  let actionPicos = 0;

  


  onMount(() => {
    // get all instantiated tribes 
    // let tribes = localStorage.getItem("tribes");
    // if (tribes !== null) {
    //   allTribes = JSON.parse(tribes);
    // }

    // instantiate a dev instance
    orchestrator = new Orchestrator(false, "dev");
    orchestrator.orchestratorConnected.subscribe(bl => {
      isConnected = bl;
    })

    orchestrator.localTribes.subscribe(t => localTribes = t);

  });

  let connectDev = async () => {
    try {
      theError = null;
      theMessage = "Loading...";

      await orchestrator.connect()
      theMessage = "Connected!";
      knownKeys = [{
        "name": "Alice",
        "key" : orchestrator.getNewKeyring().addFromUri("//Alice").address
      },
      {
        "name": "Bob",
        "key" : orchestrator.getNewKeyring().addFromUri("//Bob").address
      },
      {
        "name": "Charlie",
        "key" : orchestrator.getNewKeyring().addFromUri("//Charlie").address
      }];

    } catch (ex) {
      console.error(ex);
      if (typeof ex == 'object') {
        let {target = null} = ex;
        let {readyState = null} = target;
        
        if (readyState == 3) {
          readyState = "COULD_NOT_CONNECT"
        }
        theError = {readyState, ...ex};
      } else { 
        theError = ex;
      }
      
      
      theMessage = "Error, see below and in the console.";
    }
  }

  let clearDisconnect = async () => {
    try {
      console.log("disconnecting");
      await orchestrator.disconnect()
      theMessage = "Disconnected.";
      theError = null;
    } catch (ex) {
      theMessage = "Could not disconnect!";
      theError = ex;
    }
  }

  let createTestTribe = async () => {
    /* 
      TEST TRIBE

    */
    try {
      theMessage = "Spawning test tribe..";

      console.log($selectedUser.seed);
      let initialFounder =  {
        initialFounder: true,
        picosRequested: 1000,
        publicKey: orchestrator.getNewKeyring().addFromUri($selectedUser.seed).address,
        required: true
      };


      let otherFounder = {
        initialFounder: false,
        picosRequested: 2000,
        publicKey: orchestrator.getNewKeyring().addFromUri("//Charlie").address,
        required: true
      }
      let tribe = await orchestrator.createTribeWithFounders(
        "test",
        $selectedUser.seed, 
        initialFounder,
        [
          otherFounder
        ]
      );

      console.log(tribe);

      theMessage = `complete, somehow -- ${tribe}`



    } catch (ex) {
      console.error(ex);
      theMessage = "error, see below";
      theError = JSON.stringify(ex);
    }
  }

  let clearFounderForm = async () => {
    potentialTribeMembers = [];
    initialFounderPicosRequested = 0;
    initialTribeName = "";
    showCreate = false;
  };

  let addFounderLine  = async () => {
    potentialTribeMembers = [...potentialTribeMembers, {
      initialFounder: false,
      picosRequested: 0,
      publicKey: "",
      required: false
    }];
  };

  let createTribe = async () => {
    theMessage = "Loading..."
    try {
      // console.log({
      //   initialFounderPicosRequested, initialTribeName, potentialTribeMembers
      // });
      if (initialFounderPicosRequested == 0 || initialTribeName == "") {
        throw new Error("picos must be greater than zero, and tribe name must not be null");
      }
      let t = await orchestrator.createTribeWithFounders(
        initialTribeName,
        $selectedUser.seed,
        {initialFounder: true, picosRequested: initialFounderPicosRequested, required: true, publicKey: orchestrator.getNewKeyring().addFromUri($selectedUser.seed).address},
        potentialTribeMembers
      );


      theMessage = "done -- " + JSON.stringify(t, null, 4)
      ;
      clearFounderForm();

    } catch (ex) {
      console.error(ex);
      theError = JSON.stringify(ex);
      theMessage = "there was an error.";
    }
  }

  let openActionModal = async (tribe) => {
    actionableTribe = tribe;
    actionModalOpen = !actionModalOpen
    if (!!!actionModalOpen) { 
      actionableTribe = null;
    }
  };

  let clearActionTexts = async () => {
    actionError = null;
    actionText = null;
    actionPicos = 0;
  }

  let actionGet = async () => {
    try {
      await clearActionTexts();
      let z = await orchestrator.getTribe(actionableTribe.publicKey, $selectedUser.seed);
      actionText = z;
    } catch (ex) {
      actionError = ex; 
      console.error(ex);
    }
  }

  let actionFund = async (picos) => {
    try {
    await clearActionTexts();
    let areYouSure = confirm(`Are you sure you'd like to fund ${actionableTribe.name} with ${picos} picos?`);
    if (!!areYouSure) {
      await orchestrator.fundTribe(actionableTribe.publicKey, $selectedUser.seed, picos);
      alert("success!");
    }
    } catch (ex) {
      actionError = ex;
      console.error(ex);
    }
  };

  let actionAccept = async () => {
    await clearActionTexts();

  };

  let actionReject = async () => {
    await clearActionTexts();

  } 

  let actionFounderStatus = async () => {
    await clearActionTexts();

  }
</script>

<main>
  {#if theMessage !== null}
    <Alert color="info">
      {theMessage}
    </Alert>
  {/if}
  <Container fluid>
    <Jumbotron>
      <h2 class="text-center">Substrate Tribe Contract Tester</h2>
      <Row>
        <Col><Button color="success" block on:click={() => connectDev()}>Connect to Local Devnet</Button></Col>
        <Col><Button color="warning" block on:click={() => clearDisconnect()}>Clear/Disconnect</Button></Col>
      </Row>
    </Jumbotron> 
    <Container>
      {#if isConnected}
        <h4 class="text-center">Select an Account</h4>
        <div class="subtitle text-center">Select an account to work with.</div>
        <div class="text-center"><FounderDropdown /></div>
     
        
        {#if localTribes.length > 0}
          {#if $selectedUser.name !== null }
            <h3>Created Tribes</h3>
            <Row>
            {#each localTribes as tribe}
              <Col xs={6}>
              <h4>{tribe.name}</h4>
              Owner: {tribe.creator}<br />
              Tribe Key {tribe.publicKey}
              <!-- <br />
              <Button on:click={() => openActionModal(tribe)} block>Interact</Button> -->
                <!-- popup menu to invoke a tribe action as founder -->
              </Col>
            {/each}
            </Row>
            <Modal size="xl" isOpen={actionModalOpen}>
              <ModalHeader toggle={() => actionModalOpen = !actionModalOpen}>
                Perform Founder Action on {actionableTribe.name} (as {$selectedUser.name})
              </ModalHeader>
              <ModalBody>
                <Row>
                  <Col>
                    <Button on:click={() => actionGet()} block>Tribe Status</Button>
                  </Col>
                  <Col>
                    <Button block>Accept</Button>
                  </Col>
                  <Col>
                    <Button block>Reject</Button>
                  </Col>
                  <Col>
                    <Button block on:click={() => actionFund(actionPicos)}>Fund (picos below)</Button><br />
                    <Input bind:value={actionPicos} type="number" />
                  </Col>
                  <Col>
                    <Button block>Check Founder Status</Button>
                  </Col>
                </Row>
                {#if actionText !== null}
                  {actionText}
                {/if}
                {#if actionError !== null} 
                  <Alert color="danger">
                    Error with action: <br />
                    {JSON.stringify(actionError)}
                  </Alert>
                {/if}
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" on:click={() => actionModalOpen = !actionModalOpen}>Cancel</Button>
              </ModalFooter>
            </Modal>
          {/if}
          <hr />
        {:else}
          <h4>No tribes found in localStorage! Create one below.</h4>
        {/if}
        <h2>Connected To Local Devnet</h2>
        <!--
          Dropdown for Alice, Bob, and Charlie
        -->

        {#if $selectedUser.name == null}
          <h4>Select a user to work with.</h4>
        {:else}
          <Button color="info" block on:click={() => showCreate = !showCreate}>Create a Tribe as {$selectedUser.name}</Button>
          <br />
          <!-- <Button color="info" block on:click={() => createTestTribe()}>
            do test tribe
          </Button> -->
        {/if}
        <hr />
        {#if showCreate}
          <hr />
          <h5>Create Tribe Form</h5>
            <Row>
              <Col>
                <Button on:click={() => clearFounderForm()}>Clear Form</Button>
              </Col>
              <Col>
                <Button on:click={() => addFounderLine()}>Add Line</Button>
              </Col>
            </Row>
            <Row>
              <FormGroup>
                <Label>Tribe Name</Label>
                <Input type="text" bind:value={initialTribeName} placeholder="Tribe Name" />
              </FormGroup>
            </Row>
            <Row>
              <FormGroup>
                <Label>Initial Founders Picos Requested</Label>
                <Input type="number" bind:value={initialFounderPicosRequested} placeholder="Initial Founders Picos Requested" />
              </FormGroup>
            </Row>
            {#each potentialTribeMembers as member}
              <Row>
                <Col xs={7}>
                  <FormGroup>
                    <Label>User's Public Key</Label>
                    <Input bind:value={member.publicKey} placeholder="Potential Founder's pk" />
                  </FormGroup>
                </Col>
                <Col xs={3}>
                  <FormGroup>
                    <Label>Picos Requested</Label>
                    <Input type="number" bind:value={member.picosRequested} placeholder="# Picos Requested" />
                  </FormGroup>
                </Col>
                <Col xs={2}>
                  <FormGroup>
                    <Label>Required?</Label>
                    <Input type="switch" bind:value={member.required} label=" " />
                  </FormGroup>
                </Col>
                
              </Row>
            {/each}
            <hr />
            <Button block on:click={() => createTribe()}>Submit</Button>



            <!-- 
              Founder add form, each line is a founder
            -->


          <hr />
        {/if}

        <hr />
        Known Public Keys: 
        {#each knownKeys as kk}
          <Row><Col>
            {kk.name}
          </Col><Col>{kk.key}</Col></Row>
        {/each}
      {/if}
    </Container>  
    {#if theError !== null}
      <Alert color='danger'>
        <h4 class="alert-heading text-capitalize">Error</h4>
        <pre>{JSON.stringify(theError, null, 4)}</pre>
      </Alert>
    {/if}
  </Container>
  
</main>
