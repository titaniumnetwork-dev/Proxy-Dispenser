export interface Link {
	readonly blocked: string[];
	readonly unblocked: string[];
	readonly unknown: string[];
}

async function getBlocked(url: string): Promise<string[]> {
	const result = await checkLink(url);
	return result.blocked;
}

async function getUnblocked(url: string): Promise<string[]> {
	const result = await checkLink(url);
	return result.unblocked;
}

async function checkLink(url: string): Promise<Link> {
	const response = await fetch(
		`${process.env.FC_URL}${encodeURIComponent(url)}`,
		{
			method: "GET",
			headers: {
				"x-api-key": process.env.FC_API_KEY || "your-api-key-here",
				"Content-Type": "application/json",
			},
		},
	);

	if (!response.ok) {
		return {
			blocked: [],
			unblocked: [],
			unknown: [],
		};
	}

	const result = (await response.json()) as {
		blocked: string[];
		unblocked: string[];
		unknown: string[];
	};

	return {
		blocked: result.blocked,
		unblocked: result.unblocked,
		unknown: result.unknown,
	};
}

export { checkLink, getBlocked, getUnblocked };
