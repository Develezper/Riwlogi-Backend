function normalize(value) {
	const trimmed = String(value ?? "").trim();
	// Replace single quotes with double quotes so Python-style output parses as JSON
	const withDoubleQuotes = trimmed.replace(/'/g, '"');
	try {
		return JSON.stringify(JSON.parse(withDoubleQuotes));
	} catch {
		return trimmed.replace(/\s+/g, "");
	}
}

function prettify(value) {
	const trimmed = String(value ?? "").trim();
	try {
		return JSON.stringify(JSON.parse(trimmed.replace(/'/g, '"')), null, 0)
			.replace(/"/g, "'");
	} catch {
		return trimmed;
	}
}

function outputMatches(output, expected) {
	return normalize(output) === normalize(expected);
}

export function evaluateStage(testOutputs, stage) {
	const visibleTests = Array.isArray(stage.visible_tests)
		? stage.visible_tests
		: [];
	const allTests = Array.isArray(stage.tests) ? stage.tests : [];

	const totalTests = testOutputs.length;
	if (totalTests === 0) {
		return {
			passed: false,
			stage_score: 0,
			visible_results: [],
		};
	}

	let passedCount = 0;
	for (const testOutput of testOutputs) {
		if (outputMatches(testOutput.output, testOutput.expected)) {
			passedCount++;
		}
	}

	const passed = passedCount === totalTests;
	const stage_score = Math.round((passedCount / totalTests) * 100);

	const visibleResults = visibleTests.map((visibleTest) => {
		const testIndex = allTests.findIndex(
			(t) =>
				t.input_text === visibleTest.input_text &&
				t.expected_text === visibleTest.expected_text,
		);

		const testOutput =
			testIndex >= 0 && testIndex < testOutputs.length
				? testOutputs[testIndex]
				: null;

		if (!testOutput) {
			return {
				input_text: visibleTest.input_text,
				expected_text: visibleTest.expected_text,
				output_text: null,
				passed: false,
				error: "Test not executed",
			};
		}

		const testPassed = outputMatches(testOutput.output, testOutput.expected);
		return {
			input_text: visibleTest.input_text,
			expected_text: visibleTest.expected_text,
			output_text: prettify(testOutput.output),
			passed: testPassed,
			error: testPassed ? null : "Output mismatch",
		};
	});

	return {
		passed,
		stage_score,
		visible_results: visibleResults,
	};
}
