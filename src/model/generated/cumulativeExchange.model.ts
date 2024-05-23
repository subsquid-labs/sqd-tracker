import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class CumulativeExchange {
    constructor(props?: Partial<CumulativeExchange>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @FloatColumn_({nullable: false})
    totalAmountIn!: number

    @FloatColumn_({nullable: false})
    totalAmountOut!: number
}
