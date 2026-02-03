import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface TopCustomer {
    id: string
    nombre: string
    total: number
    count: number
}

interface TopCustomersTableProps {
    data: TopCustomer[]
}

export function TopCustomersTable({ data }: TopCustomersTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Facturas</TableHead>
                        <TableHead className="text-right">Total Facturado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No hay datos en este periodo
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.nombre}</TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-600">
                                    {formatCurrency(item.total)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
