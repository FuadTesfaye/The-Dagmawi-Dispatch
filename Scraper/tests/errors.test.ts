import { describe, expect, it } from "bun:test";
import { ChannelNotFoundError, ChannelPrivateError } from "../src/errors.js";

describe("error types", () => {
  it("includes the channel name in the not-found message", () => {
    const err = new ChannelNotFoundError("nahomssandbox");
    expect(err.message).toContain("nahomssandbox");
    expect(err.name).toBe("ChannelNotFoundError");
  });

  it("is a real Error instance for private-channel failures", () => {
    const err = new ChannelPrivateError("someprivatechannel");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ChannelPrivateError");
  });
});
