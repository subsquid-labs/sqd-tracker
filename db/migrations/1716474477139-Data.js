module.exports = class Data1716474477139 {
    name = 'Data1716474477139'

    async up(db) {
        await db.query(`CREATE TABLE "exchange_in" ("id" character varying NOT NULL, "block" numeric NOT NULL, "hash" text NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "from" text NOT NULL, "to" text NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_369252a99a644b8da54eb9936ad" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "exchange_out" ("id" character varying NOT NULL, "block" numeric NOT NULL, "hash" text NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "from" text NOT NULL, "to" text NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_8fc71109168b4221671713dce12" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "daily_exchange_in" ("id" character varying NOT NULL, "date" text NOT NULL, "total_amount" numeric NOT NULL, CONSTRAINT "PK_976c6185774a7a81c185b2a4835" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "monthly_exchange_in" ("id" character varying NOT NULL, "date" text NOT NULL, "total_amount" numeric NOT NULL, CONSTRAINT "PK_1aa2208d5b6ed20a4577abdc4ed" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "daily_exchange_out" ("id" character varying NOT NULL, "date" text NOT NULL, "total_amount" numeric NOT NULL, CONSTRAINT "PK_d9e8a3c1937321eb1592715d661" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "monthly_exchange_out" ("id" character varying NOT NULL, "date" text NOT NULL, "total_amount" numeric NOT NULL, CONSTRAINT "PK_c222d715251a4a06d3a6070bae5" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "cumulative_exchange" ("id" character varying NOT NULL, "total_amount_in" numeric NOT NULL, "total_amount_out" numeric NOT NULL, CONSTRAINT "PK_3c8839874ebd18f3f71387ddd81" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "daily_transfers" ("id" character varying NOT NULL, "date" text NOT NULL, "total_transfers" integer NOT NULL, "total_amount" numeric NOT NULL, CONSTRAINT "PK_9f72e24a0970a6d7c20c211aaa3" PRIMARY KEY ("id"))`)
        await db.query(`CREATE TABLE "holder" ("id" character varying NOT NULL, "address" text NOT NULL, "balance" numeric NOT NULL, "type" character varying(8) NOT NULL, CONSTRAINT "PK_8266ed18d931b168de2723ad322" PRIMARY KEY ("id"))`)
    }

    async down(db) {
        await db.query(`DROP TABLE "exchange_in"`)
        await db.query(`DROP TABLE "exchange_out"`)
        await db.query(`DROP TABLE "daily_exchange_in"`)
        await db.query(`DROP TABLE "monthly_exchange_in"`)
        await db.query(`DROP TABLE "daily_exchange_out"`)
        await db.query(`DROP TABLE "monthly_exchange_out"`)
        await db.query(`DROP TABLE "cumulative_exchange"`)
        await db.query(`DROP TABLE "daily_transfers"`)
        await db.query(`DROP TABLE "holder"`)
    }
}
