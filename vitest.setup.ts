import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Testing Library only auto-registers its cleanup when `globals: true` is set,
 * and this project runs without globals. Without this, mounted components leak
 * between tests in the same file and queries start matching stale trees.
 */
afterEach(cleanup);
