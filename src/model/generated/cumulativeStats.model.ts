import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, FloatColumn as FloatColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class CumulativeStats {
    constructor(props?: Partial<CumulativeStats>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @FloatColumn_({nullable: false})
    totalExchangeAmountIn!: number

    @FloatColumn_({nullable: false})
    totalExchangeAmountOut!: number

    @FloatColumn_({nullable: false})
    totalTransfersAmount!: number

    @IntColumn_({nullable: false})
    shrimpCount!: number

    @IntColumn_({nullable: false})
    goldfishCount!: number

    @IntColumn_({nullable: false})
    dolphinCount!: number

    @IntColumn_({nullable: false})
    whaleCount!: number
}
