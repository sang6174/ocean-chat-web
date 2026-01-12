import { apiClient } from "./api";
import type { User } from "../types/user.types";

export const profileService = {
    async getProfile(): Promise<User> {
        const data = await apiClient.get("/v1/profile/user");
        return data;
    },
};
