import express, { Request, Response } from 'express';
import { PolicyProcessorFast, PolicyProcessorSlow } from './policy.processor';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const csvPath = path.join(__dirname, '../../final_10000_policies.csv');
const PORT = 3000;

const app = express();
app.use(express.json());


class CSVLoader {
    async loadCSV(_csvPath: string, limit?: number): Promise<any[]> {
        const cvsArr: any[] = await new Promise((resolve, reject) => {
            const results: any[] = [];
            fs.createReadStream(_csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    if (limit !== undefined && results.length >= limit) return;
                    results.push(row);
                })
                .on('end', () => resolve(results))
                .on('error', (err) => reject(err));
        });

        return cvsArr;
    }

}

const processorFast = new PolicyProcessorFast();

app.post('/transform-policy-fast', async (_req: Request, res: Response) => {

    try {
        const policies = await new CSVLoader().loadCSV(csvPath);
        console.log(`📥 Loaded ${policies.length} policies from CSV`);

        const { results, duration } = await processorFast.processAll(policies);

        res.json({
            message: `✅ Completed sending ${policies.length} policies to /create-policy`,
            duration,
            results,
        });
    } catch (err: any) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Failed to process policies' });
    }
});


const processorSlow = new PolicyProcessorSlow();

app.post('/transform-policy-slow', async (_req: Request, res: Response) => {

    try {
        const policies = await new CSVLoader().loadCSV(csvPath, 1000);
        console.log(`📥 Loaded ${policies.length} policies from CSV`);

        const { results, duration } = await processorSlow.processAll(policies);

        res.json({
            message: `✅ Completed sending ${policies.length} policies to /create-policy`,
            duration,
            results,
        });
    } catch (err: any) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Failed to process policies' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Microservice running on http://localhost:${PORT}`);
});



