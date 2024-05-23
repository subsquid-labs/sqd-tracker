import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, IntColumn as IntColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class DailyTransfers {
    constructor(props?: Partial<DailyTransfers>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    date!: string

    @IntColumn_({nullable: false})
    totalTransfers!: number

    @FloatColumn_({nullable: false})
    totalAmount!: number
}
