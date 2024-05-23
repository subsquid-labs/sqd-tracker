import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, FloatColumn as FloatColumn_} from "@subsquid/typeorm-store"
import {HolderType} from "./_holderType"

@Entity_()
export class Holder {
    constructor(props?: Partial<Holder>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    address!: string

    @FloatColumn_({nullable: false})
    balance!: number

    @Column_("varchar", {length: 8, nullable: false})
    type!: HolderType
}
