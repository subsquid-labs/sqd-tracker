import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class HolderCounts {
    constructor(props?: Partial<HolderCounts>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @IntColumn_({nullable: false})
    shrimp!: number

    @IntColumn_({nullable: false})
    goldfish!: number

    @IntColumn_({nullable: false})
    dolphin!: number

    @IntColumn_({nullable: false})
    whale!: number
}
