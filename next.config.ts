import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    MONDAY_API_KEY: "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxOTcyMjAwMywiYWFpIjoxMSwidWlkIjo1NDE1NDI4MSwiaWFkIjoiMjAyNC0wMi0wOVQyMzowODo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTI4NDMxMTksInJnbiI6InVzZTEifQ.xshH7gVvlzc89H7bePImbYudk58FLS9vmr6NggMhxeY",
    MONDAY_BOARD_ID: "6727219152",
    MONDAY_API_URL: "https://api.monday.com/v2"
  }
};

export default nextConfig;
