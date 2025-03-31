import express from 'express';
import minimist from 'minimist';

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const PORT = argv.port || 4000;
const INSTANCE_ID = argv.id || 'default';

const app = express();
app.use(express.json());

// Very explicit typing
interface PolicyPayload {
    policy_id: string;
    shouldFail?: boolean;
    [key: string]: any;
}

app.post('/create-policy', (req, res) => {
    const handleRequest = async () => {
        const payload = req.body as PolicyPayload;
        // console.log(Array.isArray(req.body) ? '🔁 Received an array!' : '✅ Received a single policy');

        // console.log('API B received:', payload);

        // Simulate heavy logic (500ms delay)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Simulate failure for testing
        if (payload.shouldFail) {
            console.log(`❌ [Instance ${INSTANCE_ID}] Simulating failure for policy_id ${payload.policy_id}`);
            return res.status(500).json({ status: 'error', message: `Policy ${payload.policy_id} failed` });
        }

        console.log(`✅ [Instance ${INSTANCE_ID}] API received:`, payload);
        res.json({
            status: 'success',
            message: 'Data received by API B',
            instance: INSTANCE_ID
        });
    };

    // Handle any errors from the async function
    handleRequest().catch(err => {
        console.error(`Error processing request on instance ${INSTANCE_ID}:`, err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    });
});

app.listen(PORT, () => {
    console.log(`PolicyAdmin instance ${INSTANCE_ID} running on http://localhost:${PORT}`);
});