export interface Link {
	readonly blocked: string[];
	readonly unblocked: string[];
	readonly unknown: string[];
}

const EMPTY_RESULT: Link = Object.freeze({
	blocked: [],
	unblocked: [],
	unknown: [],
});

async function getBlocked(url: string): Promise<string[]> {
	const result = await checkLink(url);
	return result.blocked;
}

async function getUnblocked(url: string): Promise<string[]> {
	const result = await checkLink(url);
	return result.unblocked;
}

async function checkLink(url: string): Promise<Link> {
	if (!process.env.FC_URL || !process.env.FC_API_KEY) {
		console.error(
			"Filter check API is not configured (missing FC_URL or FC_API_KEY)",
		);
		return EMPTY_RESULT;
	}

	try {
		const response = await fetch(
			`${process.env.FC_URL}${encodeURIComponent(url)}`,
			{
				method: "GET",
				headers: {
					"x-api-key": process.env.FC_API_KEY,
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			return EMPTY_RESULT;
		}

		const result = (await response.json()) as {
			blocked?: string[];
			unblocked?: string[];
			unknown?: string[];
		};

		return {
			blocked: Array.isArray(result?.blocked) ? result.blocked : [],
			unblocked: Array.isArray(result?.unblocked) ? result.unblocked : [],
			unknown: Array.isArray(result?.unknown) ? result.unknown : [],
		};
	} catch (error) {
		console.error(`Filter check API error for ${url}:`, error);
		return EMPTY_RESULT;
	}
}

/**
 * Checks many URLs against the filter check API, at most `concurrency` at a time.
 * Duplicate URLs are only checked once.
 */
async function checkLinks(
	urls: readonly string[],
	concurrency = 10,
): Promise<Map<string, Link>> {
	const unique = [...new Set(urls)];
	const results = new Map<string, Link>();
	for (let i = 0; i < unique.length; i += concurrency) {
		const batch = unique.slice(i, i + concurrency);
		const checks = await Promise.all(batch.map((url) => checkLink(url)));
		batch.forEach((url, j) => {
			results.set(url, checks[j] ?? EMPTY_RESULT);
		});
	}
	return results;
}

export { checkLink, checkLinks, getBlocked, getUnblocked };
