import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class DailyExchangeOut {
    constructor(props?: Partial<DailyExchangeOut>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    date!: string

    @FloatColumn_({nullable: false})
    totalAmount!: number
}
