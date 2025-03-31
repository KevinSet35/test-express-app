import axios from 'axios';

export abstract class PolicyProcessor {

    protected apiEndpoints: string[] = [
        'http://localhost:4000/create-policy',
        'http://localhost:4001/create-policy',
        'http://localhost:4002/create-policy',
        'http://localhost:4003/create-policy'
    ];
    protected batchSize: number;
    protected errorOn: number[] = [6, 9, 34, 89];

    constructor(batchSize = 50) {
        this.batchSize = batchSize;
    }

    abstract processAll(policies: any[]): Promise<{ results: any[]; duration: string }>;

    // Get next server in round-robin fashion
    protected getEndpoint(index: number): string {
        return this.apiEndpoints[index % this.apiEndpoints.length];
    }

    protected formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(2);
        return `${minutes}m ${seconds}s`;
    }

    protected preSetErrors(policies: any[]) {
        for (const toError of this.errorOn) {
            if (toError - 1 >= policies.length) {
                break;
            }
            policies[toError - 1].shouldFail = true;
        }
    }
}

export class PolicyProcessorFast extends PolicyProcessor {

    async processAll(policies: any[]): Promise<{ results: any[]; duration: string }> {
        this.preSetErrors(policies);
        const results: any[] = [];
        const start = Date.now();

        // Process in parallel across all servers
        const batchPromises: Promise<any[]>[] = [];

        for (let i = 0; i < policies.length; i += this.batchSize) {
            const batch = policies.slice(i, i + this.batchSize);
            batchPromises.push(this.sendBatch(batch, i));
        }

        // Wait for all batches to complete
        const batchResults = await Promise.all(batchPromises);

        // Flatten results
        for (const batch of batchResults) {
            results.push(...batch);
        }

        const duration = this.formatDuration(Date.now() - start);
        console.log(`✅ Processed ${policies.length} of ${policies.length} policies`);
        console.log(`🕒 Finished processing in ${duration}`);

        return { results, duration };
    }

    protected async sendBatch(batch: any[], offset: number): Promise<any[]> {
        const batchPromises = batch.map((policy, index) => {
            const serverIndex = offset + index;
            const endpoint = this.getEndpoint(serverIndex);

            return axios.post<{ status: string }>(endpoint, policy)
                .then(res => ({
                    row: offset + index + 1,
                    status: res.data.status,
                    server: `server-${serverIndex % this.apiEndpoints.length + 1}`
                }))
                .catch(err => ({
                    row: offset + index + 1,
                    status: 'failed',
                    error: err.message,
                    server: `server-${serverIndex % this.apiEndpoints.length + 1}`
                }));
        });

        return Promise.all(batchPromises);
    }

}

export class PolicyProcessorSlow extends PolicyProcessor {

    async processAll(policies: any[]): Promise<{ results: any[]; duration: string }> {
        this.preSetErrors(policies);
        const results: any[] = [];
        const start = Date.now();

        const serverCount = this.apiEndpoints.length;

        for (let i = 0; i < policies.length; i += serverCount) {
            const chunk = policies.slice(i, i + serverCount);

            // Send this chunk in parallel: one policy to each server
            const chunkResults = await Promise.all(
                chunk.map((policy, index) => {
                    const globalIndex = i + index;
                    return this.sendOnePolicy(policy, globalIndex);
                })
            );

            results.push(...chunkResults);
        }

        const duration = this.formatDuration(Date.now() - start);
        console.log(`✅ Processed ${policies.length} of ${policies.length} policies`);
        console.log(`🕒 Finished processing in ${duration}`);

        return { results, duration };
    }

    protected async sendOnePolicy(policy: any, offset: number): Promise<any> {
        const serverIndex = offset;
        const endpoint = this.getEndpoint(serverIndex);

        try {
            const res = await axios.post<{ status: string }>(endpoint, policy);
            return {
                row: offset + 1,
                status: res.data.status,
                server: `server-${serverIndex % this.apiEndpoints.length + 1}`
            };
        } catch (err: any) {
            return {
                row: offset + 1,
                status: 'failed',
                error: err.message,
                server: `server-${serverIndex % this.apiEndpoints.length + 1}`
            };
        }
    }
}