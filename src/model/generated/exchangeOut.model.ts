import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class ExchangeOut {
    constructor(props?: Partial<ExchangeOut>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    block!: bigint

    @StringColumn_({nullable: false})
    hash!: string

    @DateTimeColumn_({nullable: false})
    date!: Date

    @StringColumn_({nullable: false})
    from!: string

    @StringColumn_({nullable: false})
    to!: string

    @FloatColumn_({nullable: false})
    amount!: number
}
