import { readFile } from 'fs/promises';

interface Activity {
    activityId: string;
    script: string;
    activityCode: string;
}

interface WorkflowBlock {
    preRequirement: string;
    activity: Activity;
    postRequirement: string;
}

interface WorkflowConfig {
    workflow: string;
    blocks: WorkflowBlock[];
}

// Keep track of executed blocks (by index or blockId if provided)
const executedBlocks = new Set<number>();

/**
 * Simulates executing the activity in a block.
 * In a real implementation, you might dynamically import the module from block.activity.script
 * and call an exported function.
 */
async function runActivity(block: WorkflowBlock): Promise<string> {
    console.log(
        `Executing activity "${block.activity.activityId}" from "${block.activity.script}" (expected code: ${block.activity.activityCode})`
    );
    // Simulate some asynchronous work (e.g., processing)
    await new Promise((res) => setTimeout(res, 500));
    // For demonstration, simply return the expected code.
    console.log(`Activity "${block.activity.activityId}" returned: ${block.activity.activityCode}`);
    return block.activity.activityCode;
}

/**
 * Recursively runs workflow blocks whose preRequirement matches the given requirement.
 */
async function runWorkflow(config: WorkflowConfig, fulfilledRequirement: string): Promise<void> {
    // Find all blocks with the matching preRequirement that haven't been executed.
    const eligibleBlocks = config.blocks.filter((block, index) => {
        return block.preRequirement === fulfilledRequirement && !executedBlocks.has(index);
    });

    if (eligibleBlocks.length === 0) {
        return; // Nothing to trigger
    }

    // Execute all eligible blocks concurrently.
    await Promise.all(
        eligibleBlocks.map(async (block) => {
            // Mark block as executed (using its index in the config array)
            const blockIndex = config.blocks.indexOf(block);
            executedBlocks.add(blockIndex);

            // Run the block's activity.
            const resultCode = await runActivity(block);

            // Check if the returned code matches the expected code.
            if (resultCode === block.activity.activityCode) {
                console.log(`Block with preRequirement "${block.preRequirement}" executed successfully.`);
                console.log(`Fulfilling postRequirement "${block.postRequirement}"`);
                // Recursively trigger any blocks waiting on this new requirement.
                await runWorkflow(config, block.postRequirement);
            } else {
                console.error(
                    `Block execution error: Expected "${block.activity.activityCode}", but received "${resultCode}".`
                );
            }
        })
    );
}

async function main() {
    // Load the JSON workflow configuration from file (assumed to be "workflow.json")
    const configData = await readFile('workflow.json', 'utf-8');
    const config: WorkflowConfig = JSON.parse(configData);

    console.log(`Starting workflow: ${config.workflow}`);
    // Start the orchestration with the initial pre-requirement "START".
    await runWorkflow(config, 'START');
    console.log('Workflow execution complete.');
}

main().catch((err) => console.error(err));
