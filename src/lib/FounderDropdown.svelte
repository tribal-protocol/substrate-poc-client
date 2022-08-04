<script lang="ts">
    import {
        ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle
    } from 'sveltestrap';

    import {selectedUser} from "./store"

    let dev_founders = [
        {
            name: "alice",
            seed: "//Alice"
        },
        {
            name: "bob",
            seed: "//Bob"
        },
        {
            name: "charlie",
            seed: "//Charlie"
        },
    ];
</script>
<ButtonDropdown>
    <DropdownToggle color="info" caret>Selected Account: 
        {#if $selectedUser !== null}
            {$selectedUser.name}
        {:else}
            None
        {/if}
    </DropdownToggle>
    <DropdownMenu>
        <DropdownItem header>Dev</DropdownItem>
        {#each dev_founders as founder}
            <DropdownItem on:click={() => $selectedUser = founder} >{founder.name}</DropdownItem>
        {/each}
        <DropdownItem divider />
        <DropdownItem header>Custom</DropdownItem>
        <DropdownItem disabled>Coming Soon!</DropdownItem>
    </DropdownMenu>
</ButtonDropdown>

