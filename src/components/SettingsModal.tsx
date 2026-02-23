import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSettingsStore, BoardSize } from '@/hooks/useSettingsStore';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
    const { boardSize, showCoordinates, setBoardSize, setShowCoordinates } = useSettingsStore();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Game Settings</DialogTitle>
                    <DialogDescription>
                        Customize your playing experience
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="board-size">Board Size</Label>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Adjust the visual size of the board
                            </div>
                        </div>
                        <Select
                            value={boardSize}
                            onValueChange={(value) => setBoardSize(value as BoardSize)}
                        >
                            <SelectTrigger className="w-[120px]" id="board-size">
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="show-coords">Coordinates Display</Label>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Show numbers (1-11) and letters (a-k) around the board
                            </div>
                        </div>
                        <Switch
                            id="show-coords"
                            checked={showCoordinates}
                            onCheckedChange={setShowCoordinates}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
